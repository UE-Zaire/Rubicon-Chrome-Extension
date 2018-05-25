import HistoryGraphNode from './HistoryGraphNode';
import * as d3 from 'd3';
import { SimulationNodeDatum } from 'd3';
import Page from './Page';
import GraphLink from './GraphLink';
import GraphNode from './GraphNode';
import HistoryGraph from './HistoryGraph';
import axios from 'axios';
import * as io from 'socket.io-client';

var user;

chrome.identity.getAuthToken({interactive: true}, function(token) {
    axios.get('https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=' + token)
    .then((response: any) => {
        const { id, name, link, picture } = response.data;
        user = id;
        
      axios.post('http:localhost:3005/api/chromeSession', { id, name, link, picture })
      .then((res: any) => {
          console.log(res);
      })

    })
    .catch((err: any) => {
        console.log(err);
    })
});  

var historyGraph = new HistoryGraph();
var currentHistory = null;
var toggle = true;

var socket = io.connect('http://localhost:3005');
socket.on('historyForExtension', (data) => {
    if (user === data.userId) {
        axios.get('http://localhost:3005/api/history', {params: {query: data.selectedGraphName}})
        .then((res: any) => {
            currentHistory = data.selectedGraphName;
            console.log({currentHistory})
            historyGraph = new HistoryGraph();
            historyGraph.fromJSON(res.data);
        })
        .catch(err => {
            console.log('ERROR LOADING HISTORY', err);
        })
    }
});
    
chrome.runtime.onMessage.addListener(
    (request, sender, sendResponse) => {
    if (request.type === 'deleteNode') {
      historyGraph.deleteNode(request.id);
    } else if (request.type === "getNodesAndLinks") {
        const res = historyGraph.generateGraph();
        sendResponse(res);
    } else if (request.type === 'saveHistory') {
        const name = request.name;
        currentHistory = name;
        const hist = historyGraph.toJSON(); 
        if (name.length > 1 && hist.length > 0) {
            axios.post('http://localhost:3005/api/history', {
                history: name,
                nodes: hist
            });
        sendResponse(currentHistory);
        } else if (hist.length > 0) {
            sendResponse({empty: true})
        }
    } else if (request.type === 'loadHistory') {
        const name = request.name;
        axios.get('http://localhost:3005/api/history', {params: {query: name}})
        .then(res => {
            currentHistory = name;
            historyGraph = new HistoryGraph();
            historyGraph.fromJSON(res.data);
            sendResponse({ res: 'gotIt' });
        })
        .catch(err => {
            console.log('ERROR LOADING HISTORY', err);
        })

        return true;
    } else if (request.type === 'clearHistory') {
        historyGraph = new HistoryGraph();
        currentHistory = null;
        sendResponse({'clearing': 'clearing'});
    } else if (request.type === 'addPage') {
        const url = request.url;
        let title: any = request.title.slice(0, 10).padEnd(13, '.');
        let fullTitle: any = request.title;

        axios.get('http://localhost:3005/api/extensionRecs', { params: { link: url } })
        .then(res => {
            const historyNode = historyGraph.addPage(url, title, fullTitle);
            if (historyNode) {
                for (const url of res.data) {
                    historyGraph.addSuggestion(historyNode, url[1], url[0], fullTitle);
                }
            }
            sendResponse(historyGraph.generateGraph());
        })

        return true;
    } else if (request.type === 'checkHistory') {
        sendResponse({currentHistory}); 
    } else if (request.type === "updateHistory") {
        axios.patch('http://localhost:3005/api/history', { history: request.name, nodes: historyGraph.toJSON() })
        .then(res => {
            sendResponse({done: 'done'});
        })
        return true;
    } else if (request.type === 'deleteHistory') {
        axios.delete('http://localhost:3005/api/history', { data: { history: request.name } })
        .then(res => {
            sendResponse({done: 'done'});
        })
        return true;
    } else if (request.type === 'prune') {
        historyGraph.pruneRecommendations();
        sendResponse(historyGraph.generateGraph());
    }
});

