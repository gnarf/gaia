'use strict';

function MockManifestHelper(manifest) {
  for (prop in manifest) {
    this[prop] = manifest[prop];
  }
}
