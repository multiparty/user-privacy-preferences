# User Privacy Preferences
Prototype application that allows users to receive privacy profile policy/configuration recommendations in a privacy-preserving way.

## Installation and Setup

The client and server side mpc is written entirely in JavaScript.  Running the server requires [Node](https://nodejs.org/en/), [npm](https://www.npmjs.com/) and the [JIFF Library](https://github.com/multiparty/jiff/).

Run npm to install JIFF inside the `jiff` directory:
```shell
npm install --prefix jiff
```
Minimal dummy user data is already provided as shares.json in the server directories.  If wanted, it is okay to clear this and accumulate new shares from scratch.

## Project Layout

    ├─ jiff/          Alias to JIFF library dependency
    ├─ server1/       Main clustering server root
    │  └─ public/       Web directory for hosting the server control panel
    ├─ server2/       Secondary clustering server root
    │  └─ public/       Web directory for user preference interface

## Running the Prototype

### As a Server
Start each server from its directory with the command below and specify a port number such as:
```shell
node server1/server.js 80  # Server 1 (and control panel)
node server2/server.js 81  # Server 2 (and preference UI)
```
In a real deployment environment, these directories would be instances run on separate machines, but for testing purposes they can be run both on localhost on the same machine.

### As a User
Users can go to `http(s)://server2address:80/client.html` in a web browser supporting JavaScript to input and receive recommendations.
Recommendations are updated on a manual time basis by going to `http(s)://server1address:81/controls.html` and telling the main clustering server to begin clustering.

## Network Architecture Diagram

![Image diagram.png](diagram.png)
