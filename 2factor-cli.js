#!/usr/bin/env node

var base32 = require('thirty-two');
var tfa = require('2fa');
var fs = require('fs');

// Array Remove - By John Resig (MIT Licensed)
Array.prototype.remove = function(from, to) {
    var rest = this.slice((to || from) + 1 || this.length);
    this.length = from < 0 ? this.length + from : from;
    return this.push.apply(this, rest);
};

var argv = require('minimist')(process.argv.slice(2));

var tfa_config = require('./config/tfa.js');

var providers = require('./data/providers.json');

switch(argv._[0]){
case 'a':
case 'add':
    var name = (argv.n) ? argv.n : argv.name;
    var secret = (argv.s) ? argv.s : argv.secret;
    console.info('add new provider '+name);
    notexistsProvider(name)
        .then(()=>addProvider(name,secret))
        .then((p)=> saveProviders())
        .then(()=>console.info('provider saved'))
        .catch((error)=>{
            console.error(error.message);
        });
    break;
case 's':
case 'show':
    var name = argv._[1];
    getProvider(name)
        .then((provider)=>generateCode(provider.secret))
        .then((code)=>console.log(code))
        .catch((error)=>console.error(error.message));
    break;
case 'ln':
case 'names':
    providers.map((provider)=>{
        console.log(provider.name);
    });
    break;
case 'l':
case 'list':
    providers.map((provider)=>{
        getProvider(provider.name)
            .then((provider)=>generateCode(provider.secret))
            .then((code)=>console.log(provider.name + ':\t\t' + code))
            .catch((error)=>console.error(error.message));
    });
    break;
case 'r':
case 'remove':
    var name = argv._[1];
    removeProvider(name)
        .then(()=>saveProviders())
        .then(()=>console.log('removed '+name))
        .catch((error)=>console.error(error.message));
}


function addProvider(name,secret){
    return new Promise((resolve,reject)=>{
        if( ! name)
            reject(Error('ERR_NAME_UNDEFINED'));
        else if( ! secret )
            reject(Error('ERR_SECRET_UNDEFINED'));
        else{
            var provider = {name: name, secret: secret};
            providers.push(provider);
            resolve(provider);
        }
    });
}

function notexistsProvider(name){
    return new Promise((resolve,reject)=>{
        getProvider(name).then(()=>reject(Error('ERR_PROVIDER_EXISTS')),()=>resolve());
    });
}

function removeProvider(name){
    return new Promise((resolve,reject)=>{
        for(var i=0;i<providers.length;i++){
            if(providers[i].name===name){
                providers.remove(i);
                resolve();
            }
        }
        reject(Error('ERR_PROVIDER_NOT_FOUND'));
    });
}

function getProvider(name){
    return new Promise((resolve,reject)=>{
        providers.forEach((provider)=>{
            if(provider.name===name)
                resolve(provider);
        });
        reject(Error('ERR_PROVIDER_NOT_FOUND'));
    });
}

function saveProviders(){
    return new Promise((resolve,reject)=>{
        fs.writeFile("data/providers.json", JSON.stringify(providers), function(err){
            if(err){
                reject(Error(err));
            } else {
                resolve();
            }
        });
    });
}

function generateCode(secret){
    return new Promise((resolve,reject)=>{
        // calculate the counter for the HOTP (pretending it's actually TOTP)
        var counter = Math.floor(Date.now() / 1000 / tfa_config.opts.step);
        // generate a valid code (in real-life this will be user-input)
        resolve(tfa.generateCode(base32.decode(secret), counter));
    });
}

