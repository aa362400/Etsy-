import type { Plugin } from 'postcss';

// WXSS 不支持的 CSS 伪类、伪元素、规则和属性。
const UNSUPPORTED_PSEUDOS = [
  /:has\s*\(/i,
  /::selection/i,
  /::-moz-selection/i,
  /::-webkit-backdrop/i,
  /::backdrop/i,
];
const UNSUPPORTED_ATTR_REGEXP = /\[data-[a-z-]+(?:\s*(?:=|~=)\s*(?:"[^"]*"|'[^']*'))?\]/gi;
const UNSUPPORTED_AT_RULES = new Set([
  'custom-variant',
  'property',
  'supports',
  'theme',
]);
const UNSUPPORTED_DECL_VALUE_PATTERNS = [
  /\blab\(/i,
  /\bcolor\(display-p3/i,
];

/**
 * 检查选择器中是否包含 WXSS 不支持的 :has() 伪类
 */
function hasUnsupportedPseudo(selector: string): boolean {
  return UNSUPPORTED_PSEUDOS.some((pattern) => pattern.test(selector));
}

/**
 * 从选择器中移除 [data-*="..."] 属性选择器
 */
function stripDataAttrSelectors(selector: string): string {
  return selector.replace(UNSUPPORTED_ATTR_REGEXP, '').replace(/\s{2,}/g, ' ').trim();
}

export function stripWeappUnsupportedCss(): Plugin {
  return {
    postcssPlugin: 'strip-weapp-unsupported',

    AtRule(atRule) {
      if (UNSUPPORTED_AT_RULES.has(atRule.name)) {
        atRule.remove();
      }
    },

    Rule(rule) {
      const selectors = rule.selector.split(',').map((sel) => {
        let selector = sel.trim();
        // 剥离 :has() - 包含此伪类的选择器直接丢弃
        if (hasUnsupportedPseudo(selector)) {
          return null;
        }
        // 剥离 [data-*="..."] 属性选择器
        selector = stripDataAttrSelectors(selector);
        return selector || null;
      }).filter(Boolean) as string[];

      if (selectors.length === 0) {
        rule.remove();
        return;
      }

      rule.selector = selectors.join(', ');
    },

    Declaration(decl) {
      if (UNSUPPORTED_DECL_VALUE_PATTERNS.some((pattern) => pattern.test(decl.value))) {
        decl.remove();
        return;
      }

      if (decl.prop === 'transition-property') {
        decl.value = decl.value
          .split(',')
          .map((item) => item.trim())
          .filter((item) => item && item !== 'content-visibility' && item !== 'overlay')
          .join(',');
      }
    },
  };
}

stripWeappUnsupportedCss.postcss = true;
