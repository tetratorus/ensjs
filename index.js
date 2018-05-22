/*
    This file is part of ethereum-ens.
    ethereum-ens is free software: you can redistribute it and/or modify
    it under the terms of the GNU Lesser General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
    ethereum-ens is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Lesser General Public License for more details.
    You should have received a copy of the GNU Lesser General Public License
    along with ethereum-ens.  If not, see <http://www.gnu.org/licenses/>.
*/

var Web3 = require('web3');
var utils = require('./src/utils.js');
var ENS_0 = require('./src/ens_0.js');
var ENS_1 = require('./src/ens_1.js');

/**
 * Wrapper function that returns a version of ENS that is compatible
 * with the provided version of Web3
 */
function ENSVersionHandler (provider, address, Web3js) {
  if (Web3js !== undefined) {
    Web3 = Web3js;
  }
  if (!!/^0\./.exec(Web3.version || (new Web3()).version.api)) {
    // return ENS_0(provider, address, Web3)
    return utils.construct(ENS_0, [provider, address, Web3]);;
  } else {
    // return ENS_1(provider, address, Web3);
    return utils.construct(ENS_1, [provider, address, Web3]);
  }
}

module.exports = ENSVersionHandler;
