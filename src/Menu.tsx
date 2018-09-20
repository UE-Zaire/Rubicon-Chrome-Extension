import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Button, Select } from 'antd';
import 'antd/dist/antd.css';
import { Fragment } from 'react';
const Option = Select.Option;
import axios from 'axios';

interface IgraphState {
  histories: any
}

class Menu extends React.Component<{}, IgraphState> {

  constructor(props) {
    super(props);
  }

  state: IgraphState = { histories: [] };

  componentDidMount() {
    this.getUserGraphs();
  }

  getUserGraphs() {
    axios.get('http://ec2-18-221-91-190.us-east-2.compute.amazonaws.com:3005/api/histories')
    .then((result: any) => {
      this.setState({ histories: result.data });
    })
    .catch((err: any) => {
      console.log(err);
    })
  }

  handleChange(value) {
    console.log(`selected ${value}`);
  }

  render() {
    return (
      <Fragment>
        <Button style={{ width: "100%" }}>Save Graph</Button>
        <Select
          showSearch
          style={{ width: "100%" }}
          placeholder="Select a History"
          onChange={this.handleChange}
        >
          {this.state.histories.map((history) => {
            return <Option value={history.name} key={history.id}>{history.name}</Option>
          })}
        </Select>
      </Fragment>
    )
  }
}

ReactDom.render(<Menu />, document.getElementById('menu'));