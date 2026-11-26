// Project-specific oxlint rules, loaded through `jsPlugins` in .oxlintrc.json.

// Component wrappers, mapped to the index of their props type argument.
const COMPONENT_WRAPPERS = new Map([
  ["forwardRef", 1],
  ["memo", 0],
]);
const COMPONENT_TYPES = new Set(["FC", "FunctionComponent"]);
// Utility types whose type argument is still the props shape itself.
const PROPS_WRAPPER_TYPES = new Set(["Partial", "PropsWithChildren", "Readonly", "Required"]);

function isComponentName(name) {
  return typeof name === "string" && /^[A-Z]/.test(name);
}

function getCalleeName(callee) {
  if (callee.type === "Identifier") {
    return callee.name;
  }
  if (callee.type === "MemberExpression" && callee.property.type === "Identifier") {
    return callee.property.name;
  }
  return null;
}

// Names an expression by what it is assigned to, looking through memo/forwardRef.
function getAssignedName(node) {
  let child = node;
  let parent = node.parent;
  // Only the wrapped component (first argument) inherits the name, not e.g. memo's comparator.
  while (
    parent?.type === "CallExpression" &&
    parent.arguments[0] === child &&
    COMPONENT_WRAPPERS.has(getCalleeName(parent.callee))
  ) {
    child = parent;
    parent = parent.parent;
  }

  if (parent?.type === "VariableDeclarator" && parent.id.type === "Identifier") {
    return parent.id.name;
  }
  // Object-literal components, e.g. `Link: (props) => ...` inside a vi.mock factory.
  if (parent?.type === "Property" && parent.key.type === "Identifier") {
    return parent.key.name;
  }
  return null;
}

function getFunctionName(node) {
  return node.id ? node.id.name : getAssignedName(node);
}

function getTypeArguments(node) {
  return node.typeArguments?.params ?? [];
}

function getTypeName(typeReference) {
  const { typeName } = typeReference;
  return typeName.type === "TSQualifiedName" ? typeName.right.name : typeName.name;
}

function findTypeLiteral(type) {
  switch (type?.type) {
    case "TSTypeLiteral":
      return type;
    case "TSIntersectionType":
    case "TSUnionType":
      return type.types.map(findTypeLiteral).find(Boolean) ?? null;
    case "TSTypeReference":
      return PROPS_WRAPPER_TYPES.has(getTypeName(type))
        ? (getTypeArguments(type).map(findTypeLiteral).find(Boolean) ?? null)
        : null;
    default:
      return null;
  }
}

const propsInterface = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Require React component props to be declared as a named interface.",
    },
    messages: {
      inlineProps:
        "Move the props of `{{name}}` into a named `interface {{name}}Props` (or a named type for unions) instead of an inline type.",
      propsAlias: "Declare `{{name}}` as an interface instead of an object type alias.",
    },
    schema: [],
  },
  create(context) {
    function reportInline(name, type) {
      const literal = findTypeLiteral(type);
      if (isComponentName(name) && literal) {
        context.report({ node: literal, messageId: "inlineProps", data: { name } });
      }
    }

    function checkComponent(node) {
      const [param] = node.params;
      if (!param) {
        return;
      }
      const target = param.type === "AssignmentPattern" ? param.left : param;
      reportInline(getFunctionName(node), target.typeAnnotation?.typeAnnotation);
    }

    return {
      ArrowFunctionExpression: checkComponent,
      FunctionDeclaration: checkComponent,
      FunctionExpression: checkComponent,
      // memo<{ tone: string }>(...) or forwardRef<HTMLDivElement, { tone: string }>(...)
      CallExpression(node) {
        const propsIndex = COMPONENT_WRAPPERS.get(getCalleeName(node.callee));
        if (propsIndex !== undefined) {
          reportInline(getAssignedName(node), getTypeArguments(node)[propsIndex]);
        }
      },
      // const Badge: FC<{ tone: string }> = ...
      VariableDeclarator(node) {
        const annotation = node.id.typeAnnotation?.typeAnnotation;
        if (
          annotation?.type === "TSTypeReference" &&
          COMPONENT_TYPES.has(getTypeName(annotation))
        ) {
          reportInline(node.id.name, getTypeArguments(annotation)[0]);
        }
      },
      TSTypeAliasDeclaration(node) {
        if (node.id.name.endsWith("Props") && node.typeAnnotation.type === "TSTypeLiteral") {
          context.report({ node: node.id, messageId: "propsAlias", data: { name: node.id.name } });
        }
      },
    };
  },
};

export default {
  meta: { name: "local" },
  rules: {
    "props-interface": propsInterface,
  },
};
