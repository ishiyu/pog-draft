'use strict';

module.exports = function() {
  if  (process.env.IS_OFFLINE) {
    return 'http://localhost:3000/';
  } else {
    return `https://${process.env.STAGE}.wpa-draft.site/`;
  }
};
