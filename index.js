// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
'use strict';
const axios = require('axios');
const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');
 
process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements
 
exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
 
  function welcome(agent) {
    agent.add(`Welcome to my agent!`);
  }
 
  function fallback(agent) {
    agent.add(`I didn't understand`);
    agent.add(`I'm sorry, can you try again?`);
  }
  
  function whenactivitystarts(agent){   
    var searchParams = {
		Floor: agent.parameters.Floors.length >2 ? agent.parameters.Floors: null,
		Area: agent.parameters.area,
		Status: agent.parameters.status,
		Function: agent.parameters.function,
		};
    return when(searchParams, null).then(w => { // always use return with a promise
      const Functions = searchParams.Function;
      const startDate = w.startDate;
      const endDate = w.endDate;
      const message = `The ${Functions} works are expected to start on ${startDate} and finish by ${endDate}`;
      console.log(w,agent.parameters.Floors.length, searchParams, message);
      return agent.add(message); // always use return with agent.add() under promise
    });
  }
  
  function whereactivities(){
    var searchParams = {
		Floor: agent.parameters.Floors,
		Area: agent.parameters.area,
		Status: agent.parameters.status,
		Function: agent.parameters.functions,
		};
    return where(searchParams, null).then(w => { // always use return with a promise
      const Functions = searchParams.Function;
      const startDate = w.startDate;
      const endDate = w.endDate;
      let lvls= '';
      Object.entries(w).forEach(entry => {
  		lvls += ', ' + entry[0];
		});

      const message = `The ${Functions} works are expected at ${lvls}`;
      console.log(lvls, message);
      console.log(agent.parameters, searchParams);
      return agent.add(message); // always use return with agent.add() under promise
    });
  }
  
  function whatworks(agent){
    var searchParams = {
		Floor: agent.parameters.Floors,
		Area: agent.parameters.area,
		Status: agent.parameters.status,
		Function: agent.parameters.functions,
		};
    return what(searchParams, null).then(w => { // always use return with a promise
      const Functions = searchParams.Function;
      const startDate = w.startDate;
      const endDate = w.endDate;
      
      let msg ='';
      w.forEach(function(item){
      	msg += ', ' + item;
      });
      const message = `the requested works are ${msg}`;
      console.log(msg, w, message);
      return agent.add(message); // always use return with agent.add() under promise
    });
  }
  
  function _search(params, date) {
	var searchString = Object.entries(params).filter(x => x[1]).map(([key, val]) => `${key}=${encodeURIComponent(val)}`).join('&');
    console.log(`https://sheetdb.io/api/v1/ad6wqzjdfjuj2${searchString && `/search?${searchString}`}`);
  return axios.get(`https://sheetdb.io/api/v1/ad6wqzjdfjuj2${searchString && `/search?${searchString}`}`)
      .then((result)=>{
      return date ? result.data.filter(result => new Date(result.Start) <= new Date(date.endDate || date) && new Date(result.Finish) >= new Date(date.startDate || date)) : result.data;
    });
}
  function what(params, date) {
	return _search(params, date).then(results => {
  	return [...new Set(results.map(result => result.Function).filter(Boolean))];
  });
}
function when(params, date) {
	return _search(params, date).then(results => {
	  if (!results.length) {
    	return {};
    }
    var dates = [...new Set([].concat.apply([], results.map(result => [new Date(result.Start),  new Date(result.Finish) ])))];
  	// var dates = [...new Set([].concat.apply([], results.map(result => [result.Start,  result.Finish])))];
    dates.sort((a, b) => new Date(a) - new Date(b));
    //var maxDate=new Date(Math.max.apply(null,dates));
    //var minDate=new Date(Math.min.apply(null,dates));
	//console.log(minDate.toString(), maxDate.toString(), dates);
    console.log(dates[0].toLocaleDateString("en-US"), dates[dates.length -1].toLocaleDateString("en-US"), dates.sort((a, b) => new Date(a) - new Date(b)));
    return {
	    startDate: dates[0].toLocaleDateString("en-US"),
      endDate: dates[dates.length - 1].toLocaleDateString("en-US"),
    };
  });
}

function where(params, date) {
	return _search(params, date).then(results => {
  	return results.reduce((acc, result) => {
    	acc[result.Floor] = acc[result.Floor] || [];
      acc[result.Floor].indexOf(result.Area) === -1 && acc[result.Floor].push(result.Area);
    	return acc;
    }, {});
  });
}

 
  // Run the proper function handler based on the matched Dialogflow intent name
  let intentMap = new Map();
  intentMap.set('Default Welcome Intent', welcome);
  intentMap.set('Default Fallback Intent', fallback);
  intentMap.set('WhenActivityStarts', whenactivitystarts);
  intentMap.set('WhereWorks', whereactivities);
  intentMap.set('WhatWorks', whatworks);
  agent.handleRequest(intentMap);
});