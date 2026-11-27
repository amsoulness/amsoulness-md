const { Module } = require('../main');
const { redeployCloud } = require('../core/services/cloud-api');
Module({pattern:'redeploy ?(.*)',fromMe:true,desc:'Rebuild your Koyeb or Heroku bot from the latest Amsoulness source',use:'owner'},async message=>{
  if(message.fromMe!==true)return message.sendReply('Only the connected account can request a host rebuild.');
  try{const host=await redeployCloud();return message.sendReply(`${host} accepted a build of the latest Amsoulness source. Follow progress in your host dashboard. The bot reconnects after deployment.`);}catch(error){return message.sendReply(error.message);}
});
