import React, { Component } from "react";
import { connect } from "react-redux";
import styles from "./style.css";
import * as RPC from "../../script/rpc";
import * as TYPE from "../../actions/actiontypes";

const mapStateToProps = state => {
  return {
    ...state.common
  };
};

const mapDispatchToProps = dispatch => ({});

class ContactDetail extends Component {

  // constructor(props)
  // {
  //   super(props);

  //   this.state =
  //   {
  //     selectedContactIndex: 0
  //   };
  // }

  ismyaddresses()
  {
    if(this.props.data)
    {

      let name = Object.keys(this.props.data)[this.props.selectedIndex];
      
      if (name === "")
        return true;

    }

    return false;

  }

  getname() 
  {

    if(this.props.data)
    {
      let name = Object.keys(this.props.data)[this.props.selectedIndex];

      if (name === "")
        name = "My Addresses";
        
      return name;
    }

  }

  getlocaltime() 
  {

    if(this.props.data)
    {
      let name = Object.keys(this.props.data)[this.props.selectedIndex];

      return this.time(this.props.data[name].timeZone);
    }

  }

  getphone() 
  {

    if(this.props.data)
    {
      let name = Object.keys(this.props.data)[this.props.selectedIndex];

      return this.props.data[name].phoneNum;
    }

  }

  getnotes() 
  {

    if(this.props.data)
    {
      let name = Object.keys(this.props.data)[this.props.selectedIndex];

      return this.props.data[name].notes;
    }

  }

  getmyaddresses() 
  {

    if(this.props.data)
    {
      let name = Object.keys(this.props.data)[this.props.selectedIndex];
      let addresses = Object.values(this.props.data[name].mine);

      return addresses.map(function(item, i){

        return (

          <li key={i} data-address={item} onClick={this.copyaddress}>

            <span>{item}</span> 
            <img src="images/editcopy.png" />

          </li>
          
          )

      }.bind(this));
    }

  }

  gettheiraddresses() 
  {

    if(this.props.data)
    {
      let name = Object.keys(this.props.data)[this.props.selectedIndex];
      let addresses = Object.values(this.props.data[name].notMine);

      return addresses.map(function(item, i){

        return (

        <li key={i} data-address={item} onClick={this.copyaddress}>

          <span>{item}</span> 
          <img src="images/editcopy.png" />
          
        </li>

        )

      }.bind(this));
    }

  }

  copyaddress(event) 
  {
    event.preventDefault();

    let li = event.currentTarget;
    let address = li.dataset.address;
    
    // create a temporary input element and add it to the list item (no one will see it)
    let tempInput = document.createElement("input");
    tempInput.type = "text";
    li.appendChild(tempInput);

    // set the value of the input to the selected address, then focus and select it
    tempInput.value = address;
    tempInput.focus();
    tempInput.select();

    // copy it to clipboard
    document.execCommand("Copy", false, null);

    // remove the temporary element from the DOM
    tempInput.remove();
    
    li.classList.add("copied");

    setTimeout(function() {
      li.classList.remove("copied");
    }, 5000);
  }

  addreceiveaddress() 
  {

    console.log("conditionally rendering receive address button");
    if(this.props.data)
    {
      let name = Object.keys(this.props.data)[this.props.selectedIndex];

      if (name === ""){

        return (

          <button className="button" onClick={this.props.onAddReceiveAddress}>Add Receive Address</button>

        );

      }
        
    }

  }

    /// TIME
  /// takes in the offset and the mounting point and calculates local time and diplays the local time
  /// Input:
  ///     offSet || number || diffrence in min from GMT to calculate the time in that timezone
  ///     bottomPart || HTML element || mounting point

  time(offSet)
  {
    let d = new Date();
    let utc = d.getTimezoneOffset();
    d.setMinutes(d.getMinutes() + utc);
    d.setMinutes(d.getMinutes() + offSet);

    let h = d.getHours();
    let m = d.getMinutes();
    let i = "AM";
    if (h >= 12) {
      i = "PM";
      h = h - 12;
    }
    if (h === 0) {
      h = "12";
    }
    if (m <= 9) {
      m = `0${m}`;
    }

    return `Local Time: ${h}:${m} ${i}`;

  };

  render() {

    console.log(this.ismyaddresses());

    return (

      <div id="addressbook-contact-detail">

          <h4>{this.getname()}</h4>

          <div>
            <header>Local Time</header>
            {this.getlocaltime()}
          </div>

          <div>
            <header>Phone</header>
            {this.getphone()}
          </div>

          <div>
            <header>Notes</header>
            {this.getnotes()}
          </div>

          {this.ismyaddresses() &&
            <div>
              <header>My Addresses</header>
              <ul id="my-addresses">
                {this.getmyaddresses()}
              </ul>
            </div>
          }

          {!this.ismyaddresses() &&
            <div>
              <header>Their Addresses</header>
              <ul id="their-addresses">
                {this.gettheiraddresses()}
              </ul>
            </div>
          }
          
          {this.addreceiveaddress()}

      </div>
      
    );
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ContactDetail);