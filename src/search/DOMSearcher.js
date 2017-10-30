import cheerio from 'cheerio';
import util from 'util';
import { concat } from 'lodash';

function createSelector(path, item) {
    const completePath = concat(path, item);

    const elementsWithId = completePath.map(step => !!step.id);
    const lastUsableID = elementsWithId.lastIndexOf(true);

    const importantPartOfPath = lastUsableID !== -1
        ? completePath.slice(lastUsableID)
        : completePath;

    const parts = importantPartOfPath.map(step => {
        if (step.id) return `#${step.id}`;
        const classes = step.class ? `.${step.class.split(' ').join('.')}` : '';
        let position = '';
        if (step.nthChild === 0) position = '';
        else if (step.nthChild > 0) position = `:nth-child(${step.nthChild + 1})`;
        return `${step.tag}${classes}${position}`;
    });

    return parts.join(' > ');
}

export default class DOMSearcher {
    constructor({ $, html }) {
        if (!$ && !html) throw new Error('DOMSearcher requires cheerio instance or HTML code.');
        this.$ = $ || cheerio.load(html);
        this.searchElement = this.searchElement.bind(this);
        this.findPath = this.findPath.bind(this);
    }
    searchElement(tagName, $element) {
        const { searchElement, $ } = this;

        const elementText = $element.text();
        const elementData = {
            tag: tagName,
            class: $element.attr('class'),
            id: $element.attr('id'),
        };
        const normalizedText = elementText.toLowerCase(); // to lower case to match most results
        const containsSearchString = this.searchFor.reduce(
            (contains, searchString) => {
                if (contains) return true;
                return normalizedText.indexOf(searchString) !== -1;
            },
            false,
        );

        if (!containsSearchString) return elementData;

        const childElements = $element.children();
        if (childElements.length === 0) {
            elementData.text = elementText;
            return elementData;
        }

        const children = [];
        let hasViableChild = false;
        $element.children().each(function () {
            const result = searchElement(this.tagName, $(this));
            children.push(result);
            if (result.text || result.children) hasViableChild = true;
        });
        if (hasViableChild) {
            elementData.children = children;
            return elementData;
        }
        elementData.text = elementText;
        return elementData;
    }

    findPath(currentPath, nthChild, item) {
        const { findPath } = this;
        if (item.text) {
            const selector = createSelector(currentPath, item);
            this.foundPaths.push({ selector, text: item.text });
            return;
        }

        const newPath = concat(currentPath, {
            tag: item.tag,
            id: item.id,
            class: item.class,
            nthChild,
        });

        item.children
            .filter(child => child.text || child.children)
            .map((child, index) => findPath(newPath, index, child));
    }

    find(searchFor) {
        const { $, searchElement, findPath } = this;
        if (!searchFor || !Array.isArray(searchFor) || !searchFor.length) {
            throw new Error('DOMSearcher requires array of search strings.');
        }

        this.searchFor = searchFor;
        this.foundPaths = [];

        let $body = this.$('body');
        if (!$body.length) $body = $.root().children();
        $body
            .map(function () {
                return searchElement(this.tagName, $(this));
            }).get()
            .filter(child => child.text || child.children)
            .forEach((child, index) => findPath([], index, child));

        // console.log(util.inspect(this.foundPaths, { showHidden: false, depth: null }));
        return this.foundPaths;
    }
}
