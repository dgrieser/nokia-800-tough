
(function(exports){'use strict';window.HTML_CACHE_VERSION='2';exports.MessageCacheRestore={softkeyCacheBackup:null,isFTUDisabled:null,hydrateHtml:function cache_hydrateHtml(id){let parsedResults=this.retrieve(id);let FTUEnabled='FTUEnabled';let firstMessageFTU=this.getFTUMessage(FTUEnabled);let lang=navigator.language;this.isFTUDisabled=firstMessageFTU.enabled;if(parsedResults.langDir&&(lang===parsedResults.lang)){document.querySelector('html').setAttribute('dir',parsedResults.langDir);}
if(!Startup.hasGroup){this.isFTUDisabled='true';}
let cardsNode=document.getElementById('cache-list');let FTUNode=document.getElementById('threads-set-number');if(this.isFTUDisabled===null){cardsNode.classList.add('hide');FTUNode.classList.remove('hide');}
let contents=parsedResults.contents;if(contents===''){Startup.firstDraftCheck=true;return;}
cardsNode.innerHTML=contents;let cardsChild=document.getElementById('threads-container');if(!cardsChild||!cardsChild.querySelector('ul')){Startup.firstDraftCheck=true;return;}
Startup.useCache=true;let focusdElement=cardsNode.querySelector('.hasfocused');if(focusdElement){focusdElement.classList.remove('hasfocused');}
let softkeyHTML=parsedResults.cachedSoftkey;this.softkeyCacheBackup=softkeyHTML;if((!Startup.isActivity)&&this.isFTUDisabled){if(softkeyHTML){let softkeyNODE=(new DOMParser()).parseFromString(softkeyHTML,'text/html').activeElement.childNodes[0];document.body.appendChild(softkeyNODE);}}
let headerNode=document.querySelector('.view-number');let headerNumber=this.getListFromCache();if(headerNumber){headerNode.textContent=headerNumber;}},getListFromCache:function(){return localStorage.getItem('subCount');},retrieve:function cache_retrieve(id){let value=localStorage.getItem('html_cache_'+id)||'';let index,version,langDir,lang,cachedSoftkey;index=value.indexOf(':');if(index===-1){value='';}else{version=value.substring(0,index);value=value.substring(index+1);let versionParts=version.split(',');version=versionParts[0];langDir=versionParts[1];lang=versionParts[2];cachedSoftkey=versionParts[3];}
if(version!==window.HTML_CACHE_VERSION){value='';}
return{langDir:langDir,lang:lang,cachedSoftkey:cachedSoftkey,contents:value};},getFTUMessage:function cache_getFTUMessage(id){let value=localStorage.getItem(id);return{enabled:value};}};})(this);