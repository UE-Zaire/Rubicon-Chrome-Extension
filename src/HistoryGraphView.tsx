import * as d3 from 'd3';
import { SimulationNodeDatum } from 'd3';
import * as React from 'react';
import GraphNode from './GraphNode';
import { Affix, Button, Select, Input, Form, Tag, Icon, Tooltip, Alert } from 'antd';
import * as FA from 'react-fa';
import axios from 'axios';


class HistoryGraphView extends React.Component {

  private ref: SVGSVGElement;
  private nodes: GraphNode[] = [];
  private links: Array<{source: SimulationNodeDatum, target: SimulationNodeDatum}> = [];
  private restart: any = null; // is reset to restart function once simulation is loaded
  public mouseScrollPosition = 'none';

  constructor(props: any) {
      super(props);
      this.handleClear = this.handleClear.bind(this);
  }

  public state = { toggle: true, histories: [], input: '', currentHistory: '', onHistory: false, alert: false, alertType: '' };

  public handleToggle() {
    this.loadHistory(() => this.setState({ toggle: !this.state.toggle }));
  }

  public handleInputChange(e) {
    this.setState({ input: e.target.value });
  }

  public handleFormSubmit(ev) {
    ev.preventDefault();
    const { onHistory, input } = this.state;
    const type = onHistory ? "updateHistory" : "saveHistory";
    const name: any = type === "saveHistory" ? input : onHistory;
    if (name.length < 1) {
      setTimeout(() => {
        this.setState({ alert: false, alertType: '' });
      }, 3000)
      return this.setState({ alert: true, alertType: 'name' });
    } 
    chrome.runtime.sendMessage({ type, name }, (response) => {
      if (response.empty) {
        setTimeout(() => {
          this.setState({ alert: false, alertType: '' });
        }, 3000)
        return this.setState({ alert: true, alertType: 'empty' });
      } else if (type === "saveHistory") {
        const newHistories = this.state.histories.slice();
        newHistories.unshift({ name });
        this.setState({ onHistory: name, histories: newHistories });
      } else {
        this.setState({ onHistory: name })
      }
    })
  }

  public getUserGraphs() {
    chrome.runtime.sendMessage({ type: 'getHistories' }, ({result}) => {
      this.setState({ histories: result.data });
    })
  }

  public handleChangeHistory = (evt) => {
      const title = evt;
      chrome.runtime.sendMessage({type: 'clearHistory'}, (resp) => { 
        this.loadHistory();
      })  
      chrome.runtime.sendMessage({type: 'loadHistory', name: title }, (resp) => {
        this.setState({onHistory: title});
        this.loadHistory();
      });
  }

  public handleClear() {
    chrome.runtime.sendMessage({type: 'clearHistory'}, (resp) => {
      this.setState({ onHistory: false });
      this.loadHistory();
    })
  }

  public handleDelete (ev) {
    chrome.runtime.sendMessage({type: "deleteHistory", name: this.state.onHistory}, (resp) => {
      this.setState({ histories: this.state.histories.filter(history => history.name !== this.state.onHistory )})
      this.handleClear();
    })
  }

  public pruneRecommendations() {
    chrome.runtime.sendMessage({type: "prune"}, (response) => {
      const nodes = response.nodes;
      const links = response.links;
      this.nodes = Object.keys(nodes).map(id => nodes[id]);
      this.links = links.map((link: any) => ({source: nodes[link.source], target: nodes[link.target]}));
      const nonSugNodes = Object.keys(nodes).map((key: any) => nodes[key]).filter((node: any) => !node.isSuggestion).length;
      Object.keys(nodes).forEach((n: any) => nodes[n].x += window.innerWidth - (window.innerWidth * (1 / (nonSugNodes === 1 ? 2 : nonSugNodes))));
      if (this.restart !== null) {
        this.restart();
      } else {
        this.loadGraph();
      }
    })
  }

  public loadGraph = () => {
      const svg = d3.select(this.ref);
      const width = +svg.attr("width");
      const height = +svg.attr("height");
      const color = d3.scaleOrdinal(d3.schemeCategory10);
      const simulation = d3.forceSimulation(this.nodes)
          .force("charge", d3.forceManyBody().strength(-200).distanceMax(200))
          .force("link", d3.forceLink(this.links).distance((d: any) => d.target.isSuggestion ? 60 : 100).strength(0.5))
          .force("y", d3.forceY((d: any) => 100).strength(d => d.isSuggestion? 0 : .5))
          .force("x", d3.forceX((d: any) => d.x).strength(d => d.isSuggestion? 0 : .5))
          .alphaTarget(1)

      const g = svg.append("g").attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");
      let link = g.append("g").attr("stroke", "lightblue").attr("stroke-width", 2).selectAll(".link");
      let node = g.selectAll('.node');
      const restart = (restartingSimulation: any) => {
          // Apply the general update pattern to the nodes.
          node = node.data(this.nodes, (d: any) => d.index);
          node.exit().remove();
          node = node.enter()
              .append("g")
              .attr("r", 8)
              .attr('transform', (d: any) => `translate(${d.x}, ${d.y})`)
              .merge(node);
        node.append<SVGCircleElement>('circle')
          .attr('r', (d: any) => d.isSuggestion ? 20 : 40)
          .style('stroke', 'lightblue')
          .style('stroke-width', 2)
          .style('fill', (d: any) => d.isSuggestion ? "#E8F7FB": "white")
          .on("mouseenter", (d: any) => {
              const { title } = d.data;
              d3.selectAll('circle').filter((d: any) => d.data.title === title)
              .style("fill", "lightblue");
          })
          .on("mouseleave", (d: any) => {
              const { title } = d.data;           
              d3.selectAll('circle').filter((d: any) => d.data.title === title)
              .style("fill", (d: any) => d.isSuggestion ? "#E8F7FB" : "white");
          })
          node.append("text")
              .attr("dx", -20)
              .attr("dy", ".35em")
              .attr("fill", (d: any) => color(d.index)) 
              .text((d: any) => d.data.title);

          node.append("svg:title").text((d: any) => {
            if (d.data.title.slice(0, 9) !== d.data.fullTitle.slice(0, 9)) {
              return d.data.title;
            }
            return d.data.fullTitle;
          });
          
          node.on('click', (d: any) => {
                  window.location = d.data.url;
                  restart(simulation);
              })
              node.on('contextmenu', (d: any) => {
                d3.event.preventDefault();
                chrome.runtime.sendMessage({type: "deleteNode", id: d.id});
              
                this.nodes = this.nodes.filter(n => (n.id !== d.id) && n.anchorId !== d.id);
                this.links = this.links.filter((link: any) => link.source.id !== d.id && link.target.id !== d.id);
                this.nodes = this.nodes.filter(n => n.anchorId !== n.id);
                if (!d.isSuggestion) {
                    const next = this.nodes.filter(n => n.prevId === d.id)[0];
                    const prev = this.nodes.filter(n => n.id === d.prevId)[0];
                    if (next !== undefined && prev !== undefined) {
                        next.prevId = prev.id;
                        this.links.push({
                            source: prev,
                            target: next
                        })
                    }
                }
                restart(simulation);
            })
                  node.call(d3.drag()
                      .on("start", dragstarted)
                      .on("drag", dragged)
                      .on("end", dragended))
                 
              link = link.data(this.links, (d: {source: SimulationNodeDatum, target: SimulationNodeDatum})  =>
                  d.source.index + "-" + d.target.index)
              link.exit().remove();
              link = link.enter().append("line").merge(link);

              // Update and restart the simulation.
              restartingSimulation.nodes(this.nodes);
              restartingSimulation.force("link").links(this.links);
              restartingSimulation.alpha(1).restart();
      }

      restart(simulation);

      this.restart = restart.bind(this, simulation);

      const ticked = () => {
          node.attr('transform', (d: any) => `translate(${d.x}, ${d.y})`)
          if (this.mouseScrollPosition === 'left') {
            simulation.force("x", d3.forceX((d: any) => d.x - 10).strength(d => d.isSuggestion? 0 : .5))
          } else if (this.mouseScrollPosition  === 'right') {
            simulation.force("x", d3.forceX((d: any) => d.x + 10).strength(d => d.isSuggestion? 0 : .5))
          }

          link.attr("x1", (d: any) => d.source.x)
              .attr("y1", (d: any) => d.source.y)
              .attr("x2", (d: any) => d.target.x)
              .attr("y2", (d: any) => d.target.y);
      }

      simulation.on("tick", ticked);

      function dragstarted(d: any) {
          if (!d3.event.active) {
              simulation.alphaTarget(0.3).restart()
          };
          d.fx = d.x;
          d.fy = d.y;
        }
        
        function dragged(d: any) {
          d.fx = d3.event.x;
          d.fy = d3.event.y;
        }
        
        function dragended(d: any) {
          if (!d3.event.active) {
              simulation.alphaTarget(1)
          };
          d.fx = null;
          d.fy = null;
        }
  }


  public componentDidMount() {
    chrome.runtime.sendMessage({type: "checkHistory"}, (resp) => {
      if (resp) {
        this.setState({onHistory: resp.currentHistory});
      }
    }) 

    chrome.runtime.sendMessage({type: "addPage", url: window.location.href,
     title: document.getElementsByTagName("title")[0].innerHTML}, (response) => {
      const nodes = response.nodes;
      const links = response.links;
      this.nodes = Object.keys(nodes).map(id => nodes[id]);
      this.links = links.map((link: any) => ({source: nodes[link.source], target: nodes[link.target]}));
      const nonSugNodes = Object.keys(nodes).map((key: any) => nodes[key]).filter((node: any) => !node.isSuggestion).length;
      Object.keys(nodes).forEach((n: any) => nodes[n].x += window.innerWidth - (window.innerWidth * (1 / (nonSugNodes === 1 ? 2 : nonSugNodes))));
      if (this.restart !== null) {
        this.restart();
      } else {
        this.loadGraph();
      }
    });

    this.getUserGraphs();    
  }

  public handleScroll(evt: any) {
    if (evt.clientX > window.innerWidth * 0.95) {
      this.mouseScrollPosition = 'right';
    } else if (evt.clientX < window.innerWidth * 0.05) {
      this.mouseScrollPosition = 'left';
    } else {
      this.mouseScrollPosition = 'none';
    }
  }

  public handleExitScroll() {
    this.mouseScrollPosition = 'none';
  }

  public render() {
    const width = window.innerWidth;
    const height = window.innerHeight / 4.1;
    const style = {
      backgroundColor: '#f0f2f5',
      height,
      width,
      marginBottom: "-8px",
      opacity: this.state.toggle ? 1 : 0
    };

  const inputForm = (<Input
                    type="text"
                    onChange={ this.handleInputChange.bind(this) }
                    placeholder="History Name"
                    style={{ width: '65%', marginLeft: "10px" }}
                    />);

  const show = (
    <>
      {this.state.alert ? this.state.alertType === 'name' ? <Alert message="Please Name Your History" type="warning" /> : this.state.alertType === 'empty' ? <Alert message="Add Steps To Your History" type="warning" /> : null : null }
      <div style={{ boxShadow: "0 -1px 8px 0 rgba(107, 104, 104, 0.2), 0 -1px 20px 0 rgba(80, 79, 79, 0.19)", backgroundColor: "#f65d5d", paddingBottom: "10px", paddingTop: "3px", position: "relative", height: "45px", opacity: this.state.toggle ? 1 : 0 }}>
      <Button type="primary" shape="circle" icon="shrink" style={{ marginTop: "3px", float: "left", marginLeft: "5px" }} onClick={ this.handleToggle.bind(this) }></Button>
      <Form layout="inline">
        <Form.Item>
          <span>
            { this.state.onHistory ? 
              <div style={{ marginRight: '50px', marginLeft: '5px', color: '#ffcaca', fontWeight: 'bold', fontSize: '15px', fontStyle: 'italic' }}>{this.state.onHistory}</div>
              : inputForm }
          </span>
        </Form.Item>
        <Form.Item>
          <Tooltip title={this.state.onHistory ? "Update \"" + this.state.onHistory + "\" History" : "Save History"}><Button onClick={ this.handleFormSubmit.bind(this) } shape="circle" icon={this.state.onHistory ? "reload" : "download"} style={{ marginLeft: "-60px", marginBottom: "5px" }} htmlType="submit"></Button></Tooltip>
          <Tooltip title="Clear"><Button onClick={ this.handleClear.bind(this) } shape="circle" icon="close" style={{ marginLeft: "2px", marginBottom: "5px" }} ></Button></Tooltip>
        </Form.Item>
        {this.state.onHistory ? <Tooltip title="Delete History"><Button type="default" shape="circle" icon="delete" style={{ marginRight: "16px", marginTop: "3px", marginLeft: "-14px" }} onClick={ this.handleDelete.bind(this) }/></Tooltip> : null}
        <Tooltip title="Prune Old Recommendations"><Button style={{ marginLeft: "-14px", marginTop: "3px" }} shape="circle" icon="minus" onClick={ this.pruneRecommendations.bind(this) } ></Button></Tooltip >
        <Select  
          defaultValue={this.state.histories[0] ? this.state.histories[0].name : ""}         
          showSearch
          placeholder="Select a History"
          style={{ width: "10%", right: "10px", position: "absolute", marginTop: "3px" }}
          onChange={ this.handleChangeHistory.bind(this) }>
          {this.state.histories.map((history) => {
            return <Select.Option value={history.name} key={history.id}>{history.name}</Select.Option>
          })}
        </Select>
      </Form>
      </div>
      <svg style={style} id="historySVG" ref={(ref: SVGSVGElement) => this.ref = ref}
        onMouseMove={this.handleScroll.bind(this)} onMouseOut={this.handleExitScroll.bind(this)}/>
    </>
    );

  return (
    <Affix offsetBottom={0}>
      {show}
      {!this.state.toggle && <Button type="primary" shape="circle" icon="arrows-alt" onClick={ this.handleToggle.bind(this) }></Button>}
    </Affix>
    );
  }

  private loadHistory(cb?: any) {
    chrome.runtime.sendMessage({type: "getNodesAndLinks"}, (response) => {
      const nodes = response.nodes;
      const links = response.links;
      this.nodes = Object.keys(nodes).map(id => nodes[id]);
      const nonSugNodes = Object.keys(nodes).map((key: any) => nodes[key]).filter((node: any) => !node.isSuggestion).length;
      Object.keys(nodes).forEach((n: any) => nodes[n].x += window.innerWidth - (window.innerWidth * (1 / (nonSugNodes === 1 ? 2 : nonSugNodes))));
      this.links = links.map((link: any) => ({source: nodes[link.source], target: nodes[link.target]}));
      if (this.restart !== null) {
        this.restart();
        if (cb) cb();
      } else {
        this.loadGraph();
      }
    });
  }
}

export default HistoryGraphView;


















