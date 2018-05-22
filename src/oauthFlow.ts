import axios from 'axios';
import * as io from 'socket.io-client';

interface User {
  id: string,
  name: string,
  link?: string
}

var user: User = {id: '', name: '', link: ''};

window.onload = function() {
  chrome.identity.getAuthToken({interactive: true}, function(token) {
    axios.get('https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=' + token)
    .then((response: any) => {
      const { id, name, link, picture } = response.data;

      axios.post('http:localhost:3005/api/chromeSession', { id, name, link, picture })
      .then((res: any) => {
        console.log(res);
      })

    })
    .catch((err: any) => {
      console.log(err);
    })
  });  
};

var socket = io.connect('http://localhost:3005');
socket.on("graphData", (data) => {
    console.log(data);
    //chrome.runtime.sendMessage({msg:"socket",text:data.text},function(response){});
});

export default user;