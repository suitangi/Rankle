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
  if (data['layout'] == 'transform' || data['layout'] == 'modal_dfc') { //dfc's
    var img = document.getElementById("cardImage" + index + '-1');
    var img2 = document.getElementById("cardImage" + index + '-2');
    var newImg = new Image;
    var newImg2 = new Image;

    newImg.onload = function() {
      img.src = this.src;
      document.getElementById("cardImage" + index + '-1').style = "opacity:1;";
      document.getElementById("loader" + index).style = "display:none;";
      window.submitReady[index] += 0.5;
      if (window.submitReady[index] == 1) {
        document.getElementById('card' + index).classList.remove('cardHover');
        document.getElementById("flipButt" + index).disabled = false;
      }
    }
    newImg.src = data['card_faces'][0]['image_uris']['normal'];

    newImg2.onload = function() {
      img2.src = this.src;
      window.submitReady[index] += 0.5;
      if (window.submitReady[index] == 1) {
        document.getElementById('card' + index).classList.remove('cardHover');
        document.getElementById("flipButt" + index).disabled = false;
      }
    }
    newImg2.src = data['card_faces'][1]['image_uris']['normal'];

  } else { //normal cards
    var img = document.getElementById("cardImage" + index + '-1');
    var newImg = new Image;
    newImg.onload = function() {
      img.src = this.src;
      document.getElementById('card' + index).classList.remove('cardHover');
      document.getElementById("cardImage" + index + '-1').style = "opacity:1;";
      document.getElementById("loader" + index).style = "display:none;";
      window.submitReady[index] += 1;
    }
    newImg.src = data['image_uris']['normal'];
  }
}

function requestCard(index, id) {
  fetch('https://api.scryfall.com/cards/' + id)
    .then(response => response.json())
    .then(data => loadCard(index, data))
    .catch(error => {
      console.error(error);
      $.alert({
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
        backgroundDismiss: false,
        buttons: {
          tryagain: {
            text: 'Try again',
            btnClass: 'btn-red',
            action: function() {
              loadChoices();
            }
          }
        }
      });
    });
}

function loadChoices(id1, id2) {

  window.submitReady = {
    1: 0,
    2: 0
  };
  if (id1 == null) {
    let r = Math.floor(Math.random() * window.cardList.length);
    window.cardIds[0] = window.cardList[r];
  } else {
    window.cardIds[0] = id1;
  }

  if (id2 == null) {
    r = Math.floor(Math.random() * window.cardList.length);
    window.cardIds[1] = window.cardList[r];
  } else {
    window.cardIds[1] = id2
  }

  document.getElementById("cardImage1-1").style = "opacity:0; transition: opacity 0s;";
  document.getElementById("loader1").style = "";
  document.getElementById("flipButt1").disabled = true;
  document.getElementById('card1').classList.remove('cardHover');
  document.getElementById('flip-card1').classList.remove('flipped');
  requestCard(1, window.cardIds[0]);

  document.getElementById("cardImage2-1").style = "opacity:0; transition: opacity 0s;";
  document.getElementById("loader2").style = "";
  document.getElementById("flipButt2").disabled = true;
  document.getElementById('card2').classList.remove('cardHover');
  document.getElementById('flip-card2').classList.remove('flipped');
  requestCard(2, window.cardIds[1]);
}

function setInputs() {
  document.getElementById('winnerInput').value = window.submitQueue.winners.toString();
  document.getElementById('loserInput').value = window.submitQueue.losers.toString();
}

function submitRankleForm() {
  if (window.submitQueue.length == 0)
    return;
  document.getElementById('submitButton').disabled = true;

  // console.log('form submitted!');

  document.getElementById('rankleForm').submit();
  window.submitQueue.winners = [];
  window.submitQueue.losers = [];
  window.submitQueue.length = 0;
}

function chooseCard(choice) {
  if (window.submitReady[1] + window.submitReady[2] != 2)
    return;
  window.submitQueue.length += 1;
  window.submitQueue.winners.push(window.cardIds[choice]);
  window.submitQueue.losers.push(window.cardIds[1 - choice]);
  setInputs();
  loadChoices();
  clearTimeout(window.submitTimer);
  document.getElementById('submitButton').disabled = false;
  document.getElementById('submitButton').innerText = "Submit (" + window.submitQueue.length + ")";
  window.submitTimer = setTimeout(function() {
    document.getElementById('submitButton').innerText = "Auto-submitting...";
    setTimeout(function() {
      document.getElementById('submitButton').innerText = "Submit (" + window.submitQueue.length + ")";
    }, 3000);
    submitRankleForm();
  }, 60000);
}


//start script
$(document).ready(function() {
  window.submitQueue = {};
  window.submitQueue.winners = [];
  window.submitQueue.losers = [];
  window.submitQueue.length = 0;
  window.submitTimer;
  window.cardIds = [0, 0];
  window.submitReady = {
    1: 0,
    2: 0
  };

  document.getElementById('cardImage1-1').addEventListener('click', function() {
    chooseCard(0);
  });
  document.getElementById('cardImage2-1').addEventListener('click', function() {
    chooseCard(1);
  });
  document.getElementById('card1').addEventListener('mouseenter', function() {
    this.classList.add('cardHover');
  });
  document.getElementById('card2').addEventListener('mouseenter', function() {
    this.classList.add('cardHover');
  });
  document.getElementById('card1').addEventListener('touchstart', function() {
    this.classList.add('cardHover');
  });
  document.getElementById('card2').addEventListener('touchstart', function() {
    this.classList.add('cardHover');
  });

  document.getElementById('flipButt1').addEventListener('click', function() {
    if (this.disabled)
      return;
    document.getElementById('flip-card1').classList.toggle('flipped');
  });
  document.getElementById('flipButt2').addEventListener('click', function() {
    if (this.disabled)
      return;
    document.getElementById('flip-card2').classList.toggle('flipped');
  });


  document.getElementById('submitButton').addEventListener('click', function() {
    if (this.disabled)
      return;
    submitRankleForm();
  });

  fetch('https://raw.githubusercontent.com/suitangi/Rankle/main/rank/cardList.json')
    .then(response => response.json())
    .then(data => {
      document.getElementById('submitButton').style = '';
      document.getElementById('flipButt1').style = '';
      document.getElementById('flipButt2').style = '';
      window.cardList = data;
      loadChoices();
    })
    .catch(error => {
      console.error('There was an error!', error);
    });
});
