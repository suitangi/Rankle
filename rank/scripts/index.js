const canVibrate = window.navigator.vibrate;

//Helper: Get Query
function getParameterByName(name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

//helper (mostly to clear listeners)
function recreateNode(el, withChildren) {
  if (withChildren) {
    el.parentNode.replaceChild(el.cloneNode(true), el);
  } else {
    var newEl = el.cloneNode(false);
    while (el.hasChildNodes()) newEl.appendChild(el.firstChild);
    el.parentNode.replaceChild(newEl, el);
  }
}

function loadCard(index, data) {
  var img = document.getElementById("cardImage" + index);
  var newImg = new Image;
  newImg.onload = function() {
    img.src = this.src;
    document.getElementById("cardImage" + index).style = "opacity:1;";
    window.submitReady += 1;
  }
  newImg.src = data['image_uris']['normal'];
}

function requestCard(index, id) {
  fetch('https://api.scryfall.com/cards/' + id)
    .then(response => response.json())
    .then(data => loadCard(index, data))
    .catch(error => {
      $.dialog({
        title: '<span class=\"modalTitle\">Error</span>',
        content: '<span class=\"modalText\">Couldn\'t load card image and information. Check your connection and/or Scryfall API status.</span>',
        type: 'red',
        theme: 'dark',
        animation: 'top',
        closeAnimation: 'top',
        animateFromElement: false,
        boxWidth: 'min(400px, 80%)',
        draggable: false,
        useBootstrap: false,
        typeAnimated: true,
        backgroundDismiss: true,
        buttons: {
          tryagain: {
            text: 'Try again',
            btnClass: 'btn-purple',
            action: function() {
              loadChoices();
            }
          }
        }
      });
    });
}

function loadChoices() {
  window.submitReady = 0;
  let r = Math.floor(Math.random() * window.cardList.length);
  window.cardIds[0] = window.cardList[r];
  r = Math.floor(Math.random() * window.cardList.length);
  window.cardIds[1] = window.cardList[r];

  document.getElementById("cardImage1").style = "opacity:0; transition: opacity 0s;";
  requestCard(1, window.cardIds[0]);

  document.getElementById("cardImage2").style = "opacity:0; transition: opacity 0s;";
  requestCard(2, window.cardIds[1]);
}

function setInputs() {
  document.getElementById('winnerInput').value = window.submitQueue.winners.toString();
  document.getElementById('loserInput').value = window.submitQueue.losers.toString();
}

function submitRankleForm() {
  if (window.submitQueue.length == 0)
    return;
  document.getElementById('rankleForm').submit();
  window.submitQueue.winners = [];
  window.submitQueue.losers = [];
  window.submitQueue.length = 0;
}


//start script
$(document).ready(function() {
  window.submitQueue = {};
  window.submitQueue.winners = [];
  window.submitQueue.losers = [];
  window.submitQueue.length = 0;
  window.submitTimer;
  window.cardIds = [0, 0];
  window.submitReady = 0;

  document.getElementById('card1').addEventListener('click', function() {
    if (window.submitReady != 2)
      return;
    window.submitQueue.length += 1;
    window.submitQueue.winners.push(window.cardIds[0]);
    window.submitQueue.losers.push(window.cardIds[1]);
    setInputs();
    loadChoices();
    clearTimeout(window.submitTimer);
    window.submitTimer = setTimeout(function() {
      submitRankleForm();
    }, 10000);
  });
  document.getElementById('card2').addEventListener('click', function() {
    if (window.submitReady != 2)
      return;
    window.submitQueue.length += 1;
    window.submitQueue.winners.push(window.cardIds[1]);
    window.submitQueue.losers.push(window.cardIds[0]);
    setInputs();
    loadChoices();
    clearTimeout(window.submitTimer);
    window.submitTimer = setTimeout(function() {
      submitRankleForm();
    }, 10000);
  });

  fetch('https://raw.githubusercontent.com/suitangi/Rankle/main/rank/cardList.json')
    .then(response => response.json())
    .then(data => {
      window.cardList = data;
      loadChoices();
    })
    .catch(error => {
      console.error('There was an error!', error);
    });
});
