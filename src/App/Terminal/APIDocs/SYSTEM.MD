# System API
-----------------------------------

The System API provides public access to information about this node.  This includes data such as the version of software the node is running, ledger and mempool state, node IP address, and connected peers.


## `Methods`

The following methods are currently supported by this API

[`get/info`](#getinfo)   
[`list/peers`](#listpeers)   
[`list/lisp-eids`](#listlisp-eids)   

-----------------------------------
***

# `get/info`

Returns a summary of information about this node


### Endpoint:

`/system/get/info`


### Parameters:
````
NONE
````

### Return value JSON object:
```
{
    "version": "0.3.0.0 Tritium CLI [LLD][ECC][x64] Beta",
    "protocolversion": 20000,
    "walletversion": 10000,
    "timestamp": 1557884743,
    "testnet": 11,
    "private": false,
    "multiuser": false,
    "blocks": 380,
    "synchronizing": true,
    "synccomplete": 31,
    "txtotal": 0,
    "connections": 1,
    "eids": [
        "240.139.76.244",
        "fe::139:76:244"
    ]
}

```

### Return values:

`version` : The daemon software version.

`protocolversion` : The LLP version.

`walletversion` : Legacy wallet version.

`timestamp` : Current unified time as reported by this node.

`hostname` : The local machine host name.

`testnet` : If this node is running on the testnet then this shows the testnet number.

`private` : Whether this node is running in private mode.

`multiuser` : Whether this node is running in multiuser mode.

`blocks` : The current block height of this node.

`synchronizing` : Flag indicating whether this node is currently syncrhonizing.  Not included if private=true

`synccomplete` : The percentage complete when synchronizing. Not included if private=true

`txtotal` : Number of transactions in the node's mempool.

`connections` : Number of peer connections.

`eids` : Array of LISP Endpoint Idendifiers (EID's) for this node.  Not included unless this node is using LISP.


***

# `list/peers`

Returns a summary of information about the peers currently connected to this node.  The return array is sorted by the peer `score` value.


### Endpoint:

`/system/list/peers`


### Parameters:
````
NONE
````

### Return value JSON object:
```
[
    {
        "address": "144.76.165.123:8898",
        "version": "IPv4",
        "height": 498,
        "latency": "877 ms",
        "lastseen": 1557884710351,
        "connects": 2,
        "drops": 0,
        "fails": 0,
        "score": 200.0
    },
    {
        "address": "132.45.165.111:8898",
        "version": "IPv4",
        "height": 498,
        "latency": "125 ms",
        "lastseen": 1557884710352,
        "connects": 3,
        "drops": 1,
        "fails": 0,
        "score": 100.0
    }
]


```

### Return values:

`address` : The IP address and port of the peer.  This could be a LISP EID using the LISP overlay or an IP address using the native underlay.

`type` : The version string of the connected peer.

`version` : The protocol version being used to communicate.

`session` : Session ID for the current connection

`outgoing` : Flag indicating whether this was an outgoing connection or incoming

`height` : The current height of the peer.

`best` : Block hash of the peer's best chain

`latency` : The calculated network latency between this node and the peer.

`lastseen` : Unix timestamp of the last time this node had any communications with the peer.

`connects` : The number of connections successfully established with this peer since this node started.

`drops` : The number of connections dropped with this peer since this node started.

`fails` : The number of failed connection attempts to this peer since this node started.

`score` : The score value assigned to this peer based on latency and other connection statistics.


***

# `list\lisp-eids`

This will return the LISP Endpoint Indentifers (EID's) currently configured for this node.  If the lispers.net API is not running / available then this will return an empty array.


### Endpoint:

`/system/list/lisp-eids`


### Parameters:
````
NONE
````
### Return value JSON object:
```
[
    {
        "instance-id": "200",
        "eid": "240.139.76.244",
        "rlocs": [
            {
                "interface": "wlp59s0",
                "rloc-name": "mymachine",
                "rloc": "102.162.64.46"
            }
        ]
    },
    {
        "instance-id": "200",
        "eid": "fe::139:76:244",
        "rlocs": [
            {
                "interface": "wlp59s0",
                "rloc-name": "mymachine",
                "rloc": "102.162.64.46"
            }
        ]
    }
]

```

### Return values:

`instance-id` : The LISP instance group that this EID belongs to.  

`eid` : The endpoint identifier.  This can be either IPv4 or IPv6 format

`rlocs` : The array of RLOC's (routing locators) associtated with the EID

`interface` : Name of the device for the RLOC

`rloc-name` : Hostname associated with the device

`rloc` : The IP address associated with the device. 


***
