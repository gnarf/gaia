'use strict';

var MockUtils = {
  // we need that this function does real work, so it's copied from the real
  // Utils.js
  camelCase: Utils.camelCase,
  date: Utils.date,
  startTimeHeaderScheduler: function() {},
  Template: Utils.Template,
  getFontSize: function() {
    return 12;
  },
  getDayDate: Utils.getDayDate,
  getFormattedHour: Utils.getFormattedHour,
  updateTimeHeaders: function() {},
  // real code needed here to map types
  typeFromMimeType: Utils.typeFromMimeType,
  escapeHTML: Utils.escapeHTML,
  escapeRegex: Utils.escapeRegex,
  params: Utils.params,
  getContactDetails: Utils.getContactDetails,
  getResizedImgBlob: Utils.getResizedImgBlob,
  getCarrierTag: Utils.getCarrierTag,
  removeNonDialables: Utils.removeNonDialables,
  compareDialables: Utils.compareDialables,
  getDisplayObject: Utils.getDisplayObject,

  // Derived from
  // /dom/phonenumberutils/tests/test_phonenumber.xul
  mPhoneTestCases: [
    {
      name: 'US',
      values: [
        '9995551234', '+19995551234', '(999) 555-1234',
        '1 (999) 555-1234', '+1 (999) 555-1234', '+1 999-555-1234'
      ]
    },
    {
      name: 'DE',
      values: [
        '01149451491934', '49451491934', '451491934',
        '0451 491934', '+49 451 491934', '+49451491934'
      ]
    },
    {
      name: 'IT',
      values: [
        '0577-555-555', '0577555555', '05 7755 5555', '+39 05 7755 5555'
      ]
    },
    {
      name: 'ES',
      values: [
        '612123123', '612 12 31 23', '+34 612 12 31 23'
      ]
    },
    {
      name: 'BR',
      values: [
        '01187654321', '0411187654321', '551187654321',
        '90411187654321', '+551187654321'
      ]
    },
    {
      name: 'CL',
      values: [
        '0997654321', '997654321', '(99) 765 4321', '+56 99 765 4321'
      ]
    },
    {
      name: 'CO',
      values: [
        '5712234567', '12234567', '(1) 2234567', '+57 1 2234567'
      ]
    },
    {
      name: 'FR',
      values: [
        '0123456789', '+33123456789', '0033123456789',
        '01.23.45.67.89', '01 23 45 67 89', '01-23-45-67-89',
        '+33 1 23 45 67 89'
      ]
    }
  ]
};
