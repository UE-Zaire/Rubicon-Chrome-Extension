import GraphNode from './GraphNode';
import HistoryNode from './HistoryNode';
import SuggestionNode from './SuggestionNode';
import GraphLink from './GraphLink';
import Page from './Page';
import axios from 'axios';

class HistoryGraph {
    pages: {[url: string]: Page} = {};
    nodes: Array<HistoryNode | SuggestionNode> = [];
    lastHistoryNode: HistoryNode | null = null;
    nextNodeId: number = 0;

    addPage (url, title, fullTitle): any {
        if (this.pages[title] === undefined) {
            this.pages[title] = new Page(url, title, fullTitle);
        }
        const page = this.pages[title];
        const historyNode: HistoryNode = new HistoryNode(page, this.lastHistoryNode, this.nextNodeId);
        this.nextNodeId += 1;
        if (this.lastHistoryNode !== null) {
            this.lastHistoryNode.next = historyNode;
        }
        this.lastHistoryNode = historyNode;
        this.nodes.push(historyNode);

        return historyNode;
    }

    addSuggestion(anchor, url, title, fullTitle) {
        console.log({anchor, url, title})
        if (this.pages[title] === undefined) {
            this.pages[title] = new Page(url, title, fullTitle);
        }
        const page = this.pages[title];
        const suggestionNode: SuggestionNode = new SuggestionNode(page, anchor, this.nextNodeId);
        this.nextNodeId += 1;
        anchor.suggestions.push(suggestionNode);
        this.nodes.push(suggestionNode);
    }

    deleteNode(id: number): void {
        const node: any = this.nodes.filter(n => n.id === id)[0];
        if (node.isSuggestion) {
            const a = node.anchor;
            delete a.suggestions[a.suggestions.indexOf(node)];
        } else {
            if (node.prev !== null) {
                node.prev.next = node.next;
            }
            if (node.next !== null) {
                node.next.prev = node.prev;
            }
            if (this.lastHistoryNode === node) {
                this.lastHistoryNode = node.prev;
            }
            node.suggestions.forEach(suggestion => {
                delete this.nodes[this.nodes.indexOf(suggestion)];
            })
        }
        this.nodes = this.nodes.filter(n => n.id !== id);
    }

    generateGraph(): {nodes: {[id: string]: GraphNode}, links: GraphLink[]} {
        const links: GraphLink[] = [];
        const nodes: {[id: string]: GraphNode} = {};
        this.nodes.forEach((node: any, i: number) => {
            const link: GraphLink | null = node.getLink();
            if (link !== null) {
                links.push(link);
            }
            nodes[node.id] = {
                data: node.page,
                id: node.id,
                index: node.id,
                prevId: (node.isSuggestion? null: (node.prev === null? null: node.prev.id)),
                anchorId: node.isSuggestion? node.anchor.id: null,
                isSuggestion: node.isSuggestion,
                x: i * 400,
                y: 150,
                vx: 0,
                vy: 0
            }
        })

        let last = this.lastHistoryNode;
                let lastPosition = 0;
                while (last !== null) {
                    nodes[last.id].x = lastPosition;
                    lastPosition -= 150;
                    last = last.prev;
                }

        return {nodes: nodes, links: links}
    }

    toJSON() {
        return (JSON.stringify(this.nodes.map((node: any) => ({
            data: node.page,
            id: node.id,
            isSuggestion: node.isSuggestion,
            suggestions: node.isSuggestion? null: node.suggestions.map(n => n.id),
            next: node.isSuggestion? null: (node.next === null? null: node.next.id),
            prev: node.isSuggestion? null: (node.prev === null? null: node.prev.id),
            anchor: node.isSuggestion? node.anchor.id: null
        }))));
    }

    fromJSON(nodes) {
        if (nodes.indexOf(null) !== -1) console.log('ERROR NULL');
        const nodeDict = {};
        const historyNodes = nodes.filter((n: any) => !n.isSuggestion);
        const suggestionNodes = nodes.filter((n: any) => n.isSuggestion);
        nodes.forEach((n: any) => {
            this.pages[n.data.url] = n.data;
            this.nextNodeId = Math.max(this.nextNodeId, n.id);
        })
        historyNodes.forEach((n: any) => {
            const newNode = new HistoryNode(n.data, null, n.id);
            nodeDict[n.id] = newNode;
        })
        historyNodes.forEach((n: any) => {
            if (n.next !== null) {
                nodeDict[n.id].next = nodeDict[n.next];
                nodeDict[n.next].prev = nodeDict[n.id];
            } else {
                this.lastHistoryNode = nodeDict[n.id];
            }
            if (n.prev !== null) {
                nodeDict[n.id].prev = nodeDict[n.prev];
                nodeDict[n.prev].next = nodeDict[n.id];
            }
        })
        suggestionNodes.forEach((n: any) => {
            const newNode = new SuggestionNode(this.pages[n.data.url], nodeDict[n.anchor], n.id);
            nodeDict[n.id] = newNode;
            nodeDict[n.anchor].suggestions.push(nodeDict[n.id])
        })
        console.log('NODES', Object.keys(nodeDict).map(n => nodeDict[n]));
        this.nodes =  Object.keys(nodeDict).map(n => nodeDict[n]);
    }

    pruneRecommendations() {
        const lastNode: any = this.nodes.filter((node: any) => !node.anchor && !node.next)[0];
        this.nodes = this.nodes.filter((node: any) => node.anchor ? node.anchor.page.title === lastNode.page.title : true);
    }
}

export default HistoryGraph