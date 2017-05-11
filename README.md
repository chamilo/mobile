Chamilo LMS mobile app
================================

This is a Cordova mobile app to get notifications of new messages from the 
Chamilo LMS campus of your choice.

The finished application should:
* allow you to connect to one or more Chamilo LMS campuses
* notify you when you have a new message on the Chamilo LMS campus(es)
* store your messages locally (but not allow you to answer just yet)
* Review the principal tools for courses and sessions

Spirit of this project
----------------------

This is developed as a side project and it might require a few updates to
Chamilo itself for the first version to work (web services in Chamilo will have
to be extended for it to work).

As a consequence, we will try to use PSR-1 and PSR-2 coding conventions as a
base, but we know they will not be adapted to our development, so we *will* 
update that in the future.

Installation
------------

First, clone this repository


```
git clone git@github.com:chamilo/mobile.git
cd mobile-messaging
```

Add the Android platform

```
cordova platform add android
```

Add the plugins
```
cordova plugin add cordova-plugin-network-information
cordova plugin add phonegap-plugin-push
cordova plugin add cordova-plugin-file
cordova plugin add cordova-plugin-file-transfer
```

Build an Android APK

```
cordova build android
```

Install on an Android device

```
cordova run android
```

Enable Chamilo notification pushing
-----------------------------------

If you'd like to use push notifications (only tested on Android and only available from Chamilo v1.10.4), you will have to enable and set the following parameters in your Chamilo server's:

For Chamilo v1.10.4
```
//Allow send a push notification when an email are sent
//$_configuration['messaging_allow_send_push_notification'] = 'true';
//Project number in the Google Developer Console
//$_configuration['messaging_gdc_project_number'] = '';
//Api Key in the Google Developer Console
//$_configuration['messaging_gdc_api_key'] = '';
```

For Chamilo v1.11.x
Fill the settings about the Web Services category in Configuration Settings (in administration page)

Contributing
------------

This development is taken as a side-project, so it might advance slowly at
first. Please feel free to send Pull Requests through Github, we will review
and include them if we feel they're bringing value.

Coding conventions are not clear at this time as we're mainly PHP developers
trying out HTML+JS stuff to generate a mobile app, but we have good grounds with
PSR-1 and PSR-2, so we will not accept ugly code, but we will comment on it.

[1]: http://beeznest.wordpress.com/2014/09/05/quick-phonegap-setup-on-ubuntu/
[2]: https://support.chamilo.org/issues/7402
