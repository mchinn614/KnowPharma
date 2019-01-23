'use strict'

//Searches user input against 3 OpenFDA endpoints. If more than one successful request then
//prioritize in order: manufacturer_name, brand_name, generic_name
//Next determine  is more than one companythat matches search criteria and render results accordingly
function search(input){
    $('section').empty();
    Promise.all([
        api.getFdaData("openfda.manufacturer_name",input,displayApiError),
        api.getFdaData("openfda.brand_name",input,displayApiError),
        api.getFdaData("openfda.generic_name",input,displayApiError)
      ])
      .then(results => {
        const response = results.filter(item=>item.ok).map(item=>item.json());
        if (response.length===0){
            console.log(response.length)
            $('.drug-list').html(`<h3>No results found. Please search again.</h3>`)
        }
        return Promise.all(response);
      })
      .then(responseJson=>{
        console.log(responseJson)
        const numResults = responseJson.map(item=>item.meta.results.total);
        for (let i=0;i<numResults.length;i++){
            if (numResults[i]===1){
                renderData(responseJson[i]);
            }
            else if (numResults[i]>1){
                renderMultipleResults(responseJson[i],numResults[i])
                break
            }
        }
      })
    //   .catch(error=>displayUnknownError(error))
}


//if more than one result of search function is found, then render button for each unique company
function renderMultipleResults(resultsJson,numResults){
    const limit = (numResults<99) ? numResults:99;
    api.getFdaData('openfda.manufacturer_name',resultsJson.results[0].openfda.manufacturer_name,limit)
    .then(response=>response.json())
    .then(responseJson=>{
        $('.drug-list').empty();
        $('.drug-list').append(`<h5>Multiple results found. Please select company from list.</h5>`)
        let companyList =[];
        for (let i=0;i<responseJson.results.length;i++){
            let companyName = responseJson.results[i].openfda.manufacturer_name[0];
            let id = responseJson.results[i].id;
            if (companyName.indexOf($('.search').val()>=0) && !companyList.includes(companyName.split(/[ ,.]/).join('').toLowerCase())){
                companyList.push(companyName.split(/[ ,.]/).join('').toLowerCase());
                $('.drug-list').append(
                    `<button id='companyButton' class='${id}'>${companyName}</button>`);
            }
        }
    
        $(handleSelection);
    })
    // .catch(error=>displayUnknownError(error))

};


//when company is chosen by user, then handle selection, use search function by ID
function handleSelection(){
    $('#companyButton').on('click',function(){
        $('.drug-list').empty();
        api.getFdaData('id',$(this).attr('class'),displayApiError)
        .then(response=>response.json())
        .then(responseJson=>renderData(responseJson))
        .catch(error=>displayUnknownError(error));

        })

};

//renders news and and drug data view
function renderData(json){
    const companyName = json.results[0].openfda.manufacturer_name;
    $('.news').append(`<h3>News About ${companyName}</h3>`);
    api.paginateNews(companyName,'.news','.page-news',loading,renderNewsPages);
    api.paginateFda(companyName,json.meta.results.limit,'.drugs','.page-drugs',loading,renderDrugsPages);

    // renderCompanyDrugList(companyName);
}

function loading(){
    $('.news').html('Loading data...')
};

function renderDrugsPages(results){
    return(
        results.map(item=>
            `<button type='submit' class='drug-name'>
            <h4>
            ${item.openfda.brand_name} (
            ${item.openfda.generic_name})
            </h4>
            <p class='hide'>${item.indications_and_usage}</p>
        </button>`
        ).join('')        
    )
}

function renderNewsPages(articles){

    return (
        articles.map(item=>
        `<div><a href=${item.url} target='_blank'>
                <ul>${item.title}
                    <div class ='news-wrapper'>
                        <li class='news-source'>${item.source.name}</li>
                        <li class-'news-date'>${Date(item.publishedAt)}</li> 
                    </div>   
                </ul>
            </a></div>`
        ).join('')

    )



};

//renders company news
function renderCompanyNews(companyName,newsJson){
    
    const articles = newsJson.articles;
    for (let i=0;i<articles.length;i++){
        $('.news').append(
            `<a href=${articles[i].url} class='story' target='_blank'>
                <span class='article-title'>${articles[i].title}</span>
                    <div class ='news-wrapper'>
                        <ul>
                            <li class='news-source'>${articles[i].source.name}</li>
                            <li class-'news-date'>${Date(articles[i].publishedAt)}</li> 
                        </ul>
                    </div>   
            </a>`)
    }
    
};

//renders list of drugs made by company and allows user to view indications of each medicine
function renderCompanyDrugList(companyName){
    api.getFdaData('openfda.manufacturer_name',companyName,displayApiError,10)
    .then(response=>response.json())
    .then(responseJson=>{
        $('.drugs').append(`<h3>Medicines made by ${companyName}</h3>`)
        for (let i=0;i<responseJson.results.length;i++){
            $('.drugs').append(
                `<button type='submit' class='drug-name'>
                    <h4>
                    ${responseJson.results[i].openfda.brand_name} 
                    (${responseJson.results[i].openfda.generic_name})
                    </h4>
                    <p class='hide'>${responseJson.results[i].indications_and_usage}</p>
                </button>`
            )
        }
        $(toggleDrugDescription);
    })
    .catch(error=>displayError(error))
};

//allows user to show and hide indications of drugs
function toggleDrugDescription(){
    $('.drug-name').on('click',function(){
        const display = $(this).find("p").attr('class');
        if (display==='hide') {
            $(this).find("p").removeClass('hide');
            // $(this).find("p").addClass('show');
            $(this).addClass('show')
        } 
        else{
            $(this).removeClass('show');
            $(this).find("p").addClass('hide');
        }
    })
};

//error handling
function displayUnknownError(error){
    $('section').each(section=>$('section').empty());
    $('form').append(`<p class='error'>Unknown Error</p>`)
}

//error handling
function displayApiError(error){
    $('section').each(section=>$('section').empty());
    $('form').append(`<p class='error'>${error.message}</p>`)
};

//clear search
function clearSearch(){
    $('.clear-search').on('click',event=>{
        event.preventDefault();
        $('.news').empty();
        $('.drugs').empty();
        $('.drug-list').empty();
        $('.instructions').removeClass('hide')
        $('.search').val('').focus();
        $('.clear-search').addClass('hide')
    })
}

//callback function to start function
function handleSubmit(){
    $('.search-form').on('submit',event=>{
        event.preventDefault();
        $('body').removeClass('center-body');
        $('.clear-search').removeClass('hide');
        $('.news').empty();
        $('.drugs').empty();
        $('.drug-list').empty();
        $('.instructions').addClass('hide')
        const userInput=$('.search').val();
        search(userInput);
    });
};

$(handleSubmit);
$(clearSearch);