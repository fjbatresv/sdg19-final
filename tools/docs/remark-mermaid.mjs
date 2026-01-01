import { visit } from 'unist-util-visit';

const remarkMermaid = () => (tree) => {
  visit(tree, 'code', (node, index, parent) => {
    if (!parent || typeof index !== 'number' || node.lang !== 'mermaid') {
      return;
    }

    const value = node.value || '';
    parent.children[index] = {
      type: 'html',
      value: `<div class="mermaid">\n${value}\n</div>`,
    };
  });
};

export default remarkMermaid;
