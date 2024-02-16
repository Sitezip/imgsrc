const gitDataFetcher = function(url,dir){

    const myHeaders = new Headers();
    if(api.token){
        myHeaders.append("Authorization", "Bearer " + api.token);
    }
    myHeaders.append("Cookie", "_octo=GH1.1.1855976736.1707942526; logged_in=no");

    const requestOptions = {
        method: "GET",
        headers: myHeaders,
        redirect: "follow"
    }

    //?recursive=1
    fetch(url, requestOptions)
        .then((response) => response.json())
        .then((result) => displayData(result,dir))
        .catch((error) => console.error(error));
}

const displayData = function(obj,dir){
    dir = dir ? dir + '/' : '/';
    const list = document.getElementById('list');
    const nav  = document.getElementById('nav');
    if(obj.hasOwnProperty('message')){
        const msg = document.createTextNode(obj.message);
        (nav || list).appendChild(msg);
        return;
    }
    if(obj.hasOwnProperty('git_url')){
        obj = [obj];
    }
    (obj.tree || obj).forEach(function(data){
        if(data.hasOwnProperty('git_url') && data.name === config.repo){
            gitDataFetcher(api.baseUrl + '/repos/' + config.acct + '/' + data.name + '/branches'); // {/branch}
        }else if(data.hasOwnProperty('commit') && data.name === config.branch){
            gitDataFetcher(api.baseUrl + '/repos/' + config.acct + '/' + config.repo + '/git/trees/' + data.commit.sha); // {/sha}
        }else if(data.hasOwnProperty('type') && data.type === 'tree'){
            if(nav && !data.path.includes('.idea')){
                const a     = document.createElement('a');
                a.href      = site.baseUrl + dir + data.path;
                a.innerHTML = data.path;
                const sp    = document.createTextNode(" ");
                nav.appendChild(a);
                nav.appendChild(sp);
            }
            if(window.location.pathname.includes(data.path)){
                gitDataFetcher(data.url,dir + data.path);
            }
        }else if(data.hasOwnProperty('path') && !data.path.includes('git') && !data.path.includes('.cpt') && !data.path.includes('.md') && !data.path.includes('.htm') && !data.path.includes('.xml') && !data.path.includes('.iml') && !data.path.includes('.webmanifest')){
            const a     = document.createElement('a');
            a.href      = site.baseUrl + dir + data.path;
            a.innerHTML = site.baseUrl + dir + data.path;
            a.addEventListener('mouseover', function() {
                document.getElementById('imgsrc').src = this.href;
            });
            response.response.push(site.baseUrl + dir + data.path);
            const li = document.createElement('li');
            li.appendChild(a);
            list.appendChild(li);
        }
    })
}

//site
const site  = {};
site.baseUrl = 'https://imgsrc.cloud';

//api data
const api   = {};
api.baseUrl = 'https://api.github.com';
api.zapUrl  = 'https://zzzap.io/Utilities/formatting/zcd-read/text/zCd-88003555d757a02a3a3766a1da08c37f';

//target data
const config  = {};
config.acct   = 'Saran-pariyar'; //'quasicodo42'; //
config.repo   = 'imgsrc'; //'HTMW'; //
config.branch = 'main';

//storage
const response = {config:config,response:[]};

fetch(api.zapUrl)
    .then((response) => response.json())
    .then((result) => gitInit(result))
    .catch((error) => console.error(error));

const gitInit = function(response){
    api.token = response.response || null;
    //gitDataFetcher(api.baseUrl + '/users/' + config.acct + '/repos');
    gitDataFetcher(api.baseUrl + '/repos/' + config.acct + '/' + config.repo);
}