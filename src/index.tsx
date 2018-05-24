import * as React from 'react';
import * as reactDom from 'react-dom';
import HistoryGraphView from './HistoryGraphView';

const app = document.createElement('div');
app.id = 'root';

const doc: any = document.body;
doc.append(app);

reactDom.render(<HistoryGraphView />, document.getElementById('root'));

