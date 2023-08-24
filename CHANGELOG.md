# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [0.2.0](https://github.com/OptimistikSAS/OIBus-upgrade-v3/compare/v0.1.8...v0.2.0) (2023-08-24)


### Features

* Adapt specific settings and connectors types ([0b43324](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/0b4332468657e62882a42dfdc962dd6b925ca628))
* add Encryption Service and secret migration ([f4f10c1](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/f4f10c1e90c2fb9c121416179f6eca96bb9d4610))
* add GitHub CI and Readme ([7154fcc](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/7154fcc2c8f673824ffd8bdae0b01f7827f97b3c))
* add OIBusV2Config model ([7849668](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/784966856ae839d72f356f3a9bfe70b1d96c216a))
* Create basic skeleton for upgrade and add V2 migration ([d35dff5](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/d35dff57319578603cf5b4480c89dc44614599bc))
* Migrate admin user ([cf9a62f](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/cf9a62faf43fa5967eac468956cabf5a50eb81a2))
* Migrate EngineSettings and HealthSignal ([a7fd389](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/a7fd389556f1d5e56eedbeff75eb272d403736f3))
* Migrate ExternalSources, IPFilters and Proxies ([8ba4f7e](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/8ba4f7ec7dd4c3fbf710843966dacdd92aefe6c8))
* Migrate scan modes, connectors and items ([edf7649](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/edf7649a172fa2c6f10d3e11d2e84b41bbc90695))
* **north:** Migration subscriptions ([f9c9704](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/f9c9704946ff4442f037fa5cb3bb591668ebd9f6))
* **odbc-remote:** Migrate ODBC Remote into ODBC v3 ([446097c](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/446097c3601ad4c7848da66245fe62e9205efae1))
* Use please release ([2ae6fcf](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/2ae6fcf4948ac5674603ff0d9e4d2fc7c41bf739))


### Bug Fixes

* Add workflow dispatch event ([8301fdb](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/8301fdb075e2212e4ed1bf9157253fa3a3b0a45c))
* Build binaries needs tests ([dadf293](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/dadf29328cd5798ee0326a96ee0252784fbc1139))
* Change binary and archive names ([b4dcc5e](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/b4dcc5e1941a5487834960bca007cd8a2a9aa50f))
* change outputs name for upload artifact ([ce7ad55](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/ce7ad55820acae3d6917419fc3c3beeb82de460c))
* Check release ([e723129](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/e7231297e7e8c5bf7d624aadcb58c7bc83e40dca))
* checkout with release tag ([bac2ef3](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/bac2ef3eef66906634a8af92e38c35bb221b7add))
* **ci:** Fix migration connectors ([b87c77a](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/b87c77adc11abf68247f05eba83e6a765de4f3b8))
* **ci:** Fix release CI ([39365da](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/39365dab9eb04789a8830492853ef37601c2a228))
* Fix action concurrency ([0872903](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/087290399e4a3c74eb0329183ea0688756d2e06d))
* Fix action trigger ([ad909d9](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/ad909d9a2905b2ea8d1324a83a50af3cf9141ae0))
* Fix action trigger for tests ([172df0f](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/172df0f3f04c8f392bf82d5e0de6710df84b14fd))
* Fix GitHub Action environment setup ([05eee7a](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/05eee7af8f4ed2cfb4b975f5b61561033e1e8893))
* Fix release please tag name ([277397c](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/277397ce75ba4d12ee7c5763e0828d4eb9149379))
* Fix upload and tests ci ([e54c1a4](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/e54c1a4ffc820e4e1697d5112698b8292abb6fc5))
* main branch is the release branch ([9b13928](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/9b1392860dab1332ab416c3a3ec576d0ce4e9d29))
* **migration:** Adapt migration with latest model changes ([37fe7d5](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/37fe7d5aab38c36da39b3f089cd7b8e99f9a4634))
* **opcua:** Migrate OPCUA ([3cfd6e3](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/3cfd6e3b0a21a46f4ce07d8e76f77bec7243e986))
* properly checks release created ([cec6b97](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/cec6b975af886f6e0bc41766d76179441fc6a676))
* Reactivate test before building binaries ([ae06746](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/ae06746956679f48ed2559b47668468b05cb98b0))
* release-please needs tests ([ef67275](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/ef67275649dd081c0cc5150fcde05e50385ae6e2))
* Remove unnecessary echo and ls ([e41080e](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/e41080e89f62f47725d20f079c883f00e189974b))
* Set output ([19e08ed](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/19e08edb3d12aebded4bf0219dfaedaa4d745f7b))
* **sql:** Adapt SQL connectors settings ([bacfbd1](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/bacfbd195634fe26dd0b25119baa38b64034b7a5))
* **sql:** Adapt SQL items settings ([78ab75c](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/78ab75ccb3f7d43d5657bea4a4cbfbfdb04d32ec))
* **tests:** Fix service tests ([2391774](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/239177486737c93366c3307bc59921c074fd3be3))
* Use tag_name instead of upload_url ([f83c9fe](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/f83c9fe4df56a1176ce44b3391da704d6f4b7fc5))
* Use upload url to upload artifacts ([8a8eb07](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/8a8eb07547e2e1a1b66e62db386a8dcf5f5377f3))

## [0.1.8](https://github.com/OptimistikSAS/OIBus-upgrade-v3/compare/v0.1.7...v0.1.8) (2023-08-23)


### Bug Fixes

* Reactivate test before building binaries ([ae06746](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/ae06746956679f48ed2559b47668468b05cb98b0))

## [0.1.7](https://github.com/OptimistikSAS/OIBus-upgrade-v3/compare/v0.1.6...v0.1.7) (2023-08-23)


### Bug Fixes

* Remove unnecessary echo and ls ([e41080e](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/e41080e89f62f47725d20f079c883f00e189974b))

## [0.1.6](https://github.com/OptimistikSAS/OIBus-upgrade-v3/compare/v0.1.5...v0.1.6) (2023-08-23)


### Bug Fixes

* Use tag_name instead of upload_url ([f83c9fe](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/f83c9fe4df56a1176ce44b3391da704d6f4b7fc5))

## [0.1.5](https://github.com/OptimistikSAS/OIBus-upgrade-v3/compare/v0.1.4...v0.1.5) (2023-08-23)


### Bug Fixes

* Set output ([19e08ed](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/19e08edb3d12aebded4bf0219dfaedaa4d745f7b))

## [0.1.4](https://github.com/OptimistikSAS/OIBus-upgrade-v3/compare/v0.1.3...v0.1.4) (2023-08-23)


### Bug Fixes

* Use upload url to upload artifacts ([8a8eb07](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/8a8eb07547e2e1a1b66e62db386a8dcf5f5377f3))

## [0.1.3](https://github.com/OptimistikSAS/OIBus-upgrade-v3/compare/v0.1.2...v0.1.3) (2023-08-23)


### Bug Fixes

* Fix release please tag name ([277397c](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/277397ce75ba4d12ee7c5763e0828d4eb9149379))

## [0.1.2](https://github.com/OptimistikSAS/OIBus-upgrade-v3/compare/v0.1.1...v0.1.2) (2023-08-23)


### Bug Fixes

* Fix upload and tests ci ([e54c1a4](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/e54c1a4ffc820e4e1697d5112698b8292abb6fc5))

## [0.1.1](https://github.com/OptimistikSAS/OIBus-upgrade-v3/compare/v0.1.0...v0.1.1) (2023-08-23)


### Bug Fixes

* Fix action concurrency ([0872903](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/087290399e4a3c74eb0329183ea0688756d2e06d))

## [0.1.0](https://github.com/OptimistikSAS/OIBus-upgrade-v3/compare/v0.0.1...v0.1.0) (2023-08-23)


### Features

* Use please release ([2ae6fcf](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/2ae6fcf4948ac5674603ff0d9e4d2fc7c41bf739))


### Bug Fixes

* Add workflow dispatch event ([8301fdb](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/8301fdb075e2212e4ed1bf9157253fa3a3b0a45c))
* Build binaries needs tests ([dadf293](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/dadf29328cd5798ee0326a96ee0252784fbc1139))
* change outputs name for upload artifact ([ce7ad55](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/ce7ad55820acae3d6917419fc3c3beeb82de460c))
* Check release ([e723129](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/e7231297e7e8c5bf7d624aadcb58c7bc83e40dca))
* checkout with release tag ([bac2ef3](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/bac2ef3eef66906634a8af92e38c35bb221b7add))
* Fix action trigger ([ad909d9](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/ad909d9a2905b2ea8d1324a83a50af3cf9141ae0))
* Fix action trigger for tests ([172df0f](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/172df0f3f04c8f392bf82d5e0de6710df84b14fd))
* properly checks release created ([cec6b97](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/cec6b975af886f6e0bc41766d76179441fc6a676))
* release-please needs tests ([ef67275](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/ef67275649dd081c0cc5150fcde05e50385ae6e2))

### 0.0.1 (2023-08-23)


### Features

* Adapt specific settings and connectors types ([0b43324](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/0b4332468657e62882a42dfdc962dd6b925ca628))
* add Encryption Service and secret migration ([f4f10c1](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/f4f10c1e90c2fb9c121416179f6eca96bb9d4610))
* add GitHub CI and Readme ([7154fcc](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/7154fcc2c8f673824ffd8bdae0b01f7827f97b3c))
* add OIBusV2Config model ([7849668](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/784966856ae839d72f356f3a9bfe70b1d96c216a))
* Create basic skeleton for upgrade and add V2 migration ([d35dff5](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/d35dff57319578603cf5b4480c89dc44614599bc))
* Migrate admin user ([cf9a62f](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/cf9a62faf43fa5967eac468956cabf5a50eb81a2))
* Migrate EngineSettings and HealthSignal ([a7fd389](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/a7fd389556f1d5e56eedbeff75eb272d403736f3))
* Migrate ExternalSources, IPFilters and Proxies ([8ba4f7e](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/8ba4f7ec7dd4c3fbf710843966dacdd92aefe6c8))
* Migrate scan modes, connectors and items ([edf7649](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/edf7649a172fa2c6f10d3e11d2e84b41bbc90695))
* **north:** Migration subscriptions ([f9c9704](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/f9c9704946ff4442f037fa5cb3bb591668ebd9f6))
* **odbc-remote:** Migrate ODBC Remote into ODBC v3 ([446097c](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/446097c3601ad4c7848da66245fe62e9205efae1))


### Bug Fixes

* **ci:** Fix migration connectors ([b87c77a](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/b87c77adc11abf68247f05eba83e6a765de4f3b8))
* **ci:** Fix release CI ([39365da](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/39365dab9eb04789a8830492853ef37601c2a228))
* Fix GitHub Action environment setup ([05eee7a](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/05eee7af8f4ed2cfb4b975f5b61561033e1e8893))
* main branch is the release branch ([9b13928](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/9b1392860dab1332ab416c3a3ec576d0ce4e9d29))
* **migration:** Adapt migration with latest model changes ([37fe7d5](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/37fe7d5aab38c36da39b3f089cd7b8e99f9a4634))
* **opcua:** Migrate OPCUA ([3cfd6e3](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/3cfd6e3b0a21a46f4ce07d8e76f77bec7243e986))
* **sql:** Adapt SQL connectors settings ([bacfbd1](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/bacfbd195634fe26dd0b25119baa38b64034b7a5))
* **sql:** Adapt SQL items settings ([78ab75c](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/78ab75ccb3f7d43d5657bea4a4cbfbfdb04d32ec))
* **tests:** Fix service tests ([2391774](https://github.com/OptimistikSAS/OIBus-upgrade-v3/commit/239177486737c93366c3307bc59921c074fd3be3))
