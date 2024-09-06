'use strict';window.builtInRingtones=(function(){var ID_PREFIX='builtin:';var BASE_URLS={'ringtone':'/shared/resources/media/ringtones/','alerttone':'/shared/resources/media/notifications/'};var mimeTypeMap={'.mp3':'audio/mp3','.mp4':'audio/mp4','.ogg':'audio/ogg','.opus':'audio/ogg','.mid':'audio/x-midi'};function inferMimeType(filename){var dot=filename.lastIndexOf('.');if(dot===-1){console.warn('Couldn\'t infer mimetype for '+filename);return'application/octet-stream';}
var ext=filename.substr(dot);return mimeTypeMap[ext]||'application/octet-stream';}
function BuiltInRingtone(toneType,filename,toneDef){this._toneType=toneType;this._filename=filename;this._l10nID=toneDef.l10nID;}
BuiltInRingtone.prototype={get _rootName(){return this._filename.replace(/\.\w+$/,'');},get name(){return navigator.mozL10n.get(this.l10nID);},get filename(){return this._filename;},get l10nID(){return this._l10nID;},get id(){return ID_PREFIX+this._toneType+'/'+this._rootName;},get type(){return this._toneType;},get url(){return BASE_URLS[this._toneType]+this._filename;},get shareable(){return true;},get deletable(){return false;},getBlob:function(){var url=this.url;return new Promise(function(resolve,reject){var xhr=new XMLHttpRequest();xhr.open('GET',url);xhr.overrideMimeType(inferMimeType(url));xhr.responseType='blob';xhr.send();xhr.onload=function(){resolve(xhr.response);};xhr.onerror=function(){var err=new Error('Could not read sound file: '+url+' (status: '+xhr.status+')');console.error(err);reject(err);};});}};function idToToneType(id){var slash=id.indexOf('/');if(id.indexOf(ID_PREFIX)!==0||slash===-1){throw new Error('invalid id: '+id);}
return id.substring(ID_PREFIX.length,slash);}
function idMatchesFilename(id,toneType,filename){return id===ID_PREFIX+toneType+'/'+filename.replace(/\.\w+$/,'');}
var toneDefsCache={};function getSoundFilenames(toneType){if(!(toneType in BASE_URLS)){throw new Error('tone type not supported: '+toneType);}
return new Promise(function(resolve,reject){if(toneType in toneDefsCache){resolve(toneDefsCache[toneType]);return;}
var xhr=new XMLHttpRequest();xhr.open('GET',BASE_URLS[toneType]+'list.json');xhr.responseType='json';xhr.send(null);xhr.onload=function(){toneDefsCache[toneType]=xhr.response;resolve(xhr.response);};xhr.onerror=function(){var err=new Error('Could not read sounds list for '+toneType+' (status: '+xhr.status+')');console.error(err);reject(err);};});}
function list(toneType){return getSoundFilenames(toneType).then(function(toneDefs){var tones=[];for(var filename in toneDefs){tones.push(new BuiltInRingtone(toneType,filename,toneDefs[filename]));}
return tones;});}
function get(id){return new Promise(function(resolve,reject){var toneType=idToToneType(id);resolve(getSoundFilenames(toneType).then(function(toneDefs){for(var filename in toneDefs){if(idMatchesFilename(id,toneType,filename)){return new BuiltInRingtone(toneType,filename,toneDefs[filename]);}}
var err=new Error('No '+toneType+' found with id = '+id);console.error(err);throw err;}));});}
return{list:list,get:get,get toneTypes(){return Object.keys(BASE_URLS);}};})();