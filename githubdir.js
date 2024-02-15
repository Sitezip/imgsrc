const gitDataFetcher = function(url,dir){

    const myHeaders = new Headers();
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
    console.log(obj,dir);
    const list = document.getElementById('list');
    (obj.tree || obj).forEach(function(data){
        if(data.hasOwnProperty('git_url') && data.name === config.repo){
            gitDataFetcher(api.baseUrl + '/repos/' + config.acct + '/' + data.name + '/branches'); // {/branch}
        }else if(data.hasOwnProperty('commit') && data.name === config.branch){
            gitDataFetcher(api.baseUrl + '/repos/' + config.acct + '/' + config.repo + '/git/trees/' + data.commit.sha); // {/sha}
        }else if(data.hasOwnProperty('type') && data.type === 'tree'){
            // const li  = document.createElement('li');
            // const txt = document.createTextNode(data.path);
            // li.appendChild(txt);
            // list.appendChild(li);
            if(window.location.pathname.includes(data.path)){
                gitDataFetcher(data.url,dir + data.path);
            }
        }else if(data.hasOwnProperty('path') && !data.path.includes('git') && !data.path.includes('.md') && !data.path.includes('.htm') && !data.path.includes('.xml') && !data.path.includes('.iml')){
            const a     = document.createElement('a');
            a.href      = site.baseUrl + dir + data.path;
            a.innerHTML = site.baseUrl + dir + data.path;
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

//target data
const config  = {};
config.acct   = 'Saran-pariyar'; //'quasicodo42'; //
config.repo   = 'imgsrc'; //'HTMW'; //
config.branch = 'main';

const response = {config:config,response:[]};

gitDataFetcher(api.baseUrl + '/users/' + config.acct + '/repos');