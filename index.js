'use strict';

const Alexa = require('alexa-sdk');
const pairs = require('./pairs');
const https = require('https');

const APP_ID = undefined; // TODO replace with your app ID (OPTIONAL).

const languageStrings = {
  'en': {
    translation: {
      SKILL_NAME: 'Crypto Bot',
      WELCOME_MESSAGE: "Welcome to %s. You can ask a question like, what\'s the price of a bitcoin? ... Now, what can I help you with?",
      WELCOME_REPROMPT: 'For instructions on what you can say, please say help me.',
      OTHER_PROMPT: 'What other price would you like to know?',
      HELP_MESSAGE: "You can ask questions such as, what\'s the price of a bitcoin..., ethereum, or..., you can say exit...Now, what can I help you with?",
      HELP_REPROMPT: "You can say things like, what\'s the price of a bitcoin, or you can say exit...Now, what can I help you with?",
      STOP_MESSAGE: 'Goodbye!',
      CRYPTO_NOT_FOUND_MESSAGE: "I\'m sorry, I currently do not know ",
      CRYPTO_NOT_FOUND_MESSAGE_WITH_CURRENCY: "what %s is. ",
      CRYPTO_NOT_FOUND_REPROMPT: 'What else can I help with?',
      UNKNOWN_ASSET_PAIR: 'Unkown asset pair. '
    }
  }
}

const handlers = {
  'NewSession': function () {
    if (this.event.request.type === 'IntentRequest') {
      this.emit(this.event.request.intent.name);
    } else {
      this.emit('LaunchRequest');
    }
  },
  'LaunchRequest': function () {
    this.attributes.speechOutput = this.t('WELCOME_MESSAGE', this.t('SKILL_NAME'));
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    this.attributes.repromptSpeech = this.t('WELCOME_REPROMPT');
    this.emit(':ask', this.attributes.speechOutput, this.attributes.repromptSpeech);
  },
  'CryptoIntent': function () {
    const firstCurrency = this.event.request.intent.slots.FirstCurrency;
    const secondCurrency = this.event.request.intent.slots.SecondCurrency;
    let firstCurrencyName;
    let secondCurrencyName;

    if (firstCurrency && firstCurrency.value) {
      firstCurrencyName = firstCurrency.value.toLowerCase();
    }
    if (secondCurrency && secondCurrency.value) {
      secondCurrencyName = secondCurrency.value.toLowerCase();
    } else {
      secondCurrencyName = 'dollars';
    }

    const currencyAbbrv1 = pairs[firstCurrencyName];
    const currencyAbbrv2 = pairs[secondCurrencyName];

    if (currencyAbbrv1 && currencyAbbrv2) {
      let body = "";
      const pair = `${currencyAbbrv1}${currencyAbbrv2}`;
      const endpoint = `https://api.kraken.com/0/public/Ticker?pair=${pair}`
      https.get(endpoint, (response) => {
        response.on('data', (data) => {
          body += data;
        });
        response.on('end', () => {
          body = JSON.parse(body);
          if (body.error.length > 0) {
            this.emit(':tell', this.t('UNKNOWN_ASSET_PAIR'));
          } else {
            let amount;
            const fullAmount = body.result[Object.keys(body.result)[0]].a[0];
            if (fullAmount.substring(0, 1) == 0) {
              amount = fullAmount.substring(0, 5);
            } else {
              amount = fullAmount.split('.')[0]
            }
            this.attributes.speechOutput = `One ${firstCurrencyName} is ${amount} ${secondCurrencyName}`;
            this.emit(':ask', this.attributes.speechOutput, this.t('OTHER_PROMPT'));
          }
        })

      })
    } else {
      let speechOutput = this.t('CRYPTO_NOT_FOUND_MESSAGE');
      const repromptSpeech = this.t('CRYPTO_NOT_FOUND_REPROMPT');
      if (!currencyAbbrv1) {
        speechOutput += this.t('CRYPTO_NOT_FOUND_MESSAGE_WITH_CURRENCY', firstCurrencyName);
      }
      if (!currencyAbbrv2) {
        speechOutput += this.t('CRYPTO_NOT_FOUND_MESSAGE_WITH_CURRENCY', secondCurrencyName);
      }
      speechOutput += repromptSpeech;

      this.attributes.speechOutput = speechOutput;
      this.attributes.repromptSpeech = repromptSpeech;

      this.emit(':ask', speechOutput, repromptSpeech);
    }
  },

  'AMAZON.HelpIntent': function () {
    this.attributes.speechOutput = this.t('HELP_MESSAGE');
    this.attributes.repromptSpeech = this.t('HELP_REPROMPT');
    this.emit(':ask', this.attributes.speechOutput, this.attributes.repromptSpeech);
  },
  'AMAZON.RepeatIntent': function () {
    this.emit(':ask', this.attributes.speechOutput, this.attributes.repromptSpeech);
  },
  'AMAZON.StopIntent': function () {
    this.emit('SessionEndedRequest');
  },
  'AMAZON.CancelIntent': function () {
    this.emit('SessionEndedRequest');
  },
  'SessionEndedRequest': function () {
    this.emit(':tell', this.t('STOP_MESSAGE'));
  },
  'Unhandled': function () {
    this.attributes.speechOutput = this.t('HELP_MESSAGE');
    this.attributes.repromptSpeech = this.t('HELP_REPROMPT');
    this.emit(':ask', this.attributes.speechOutput, this.attributes.repromptSpeech);
  },
}


exports.handler = function (event, context) {
  const alexa = Alexa.handler(event, context);
  alexa.APP_ID = APP_ID;
  // To enable string internationalization (i18n) features, set a resources object.
  alexa.resources = languageStrings;
  alexa.registerHandlers(handlers);
  alexa.execute();
}
