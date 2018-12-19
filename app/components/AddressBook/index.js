// External Dependencies
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { remote } from 'electron';
import { Link } from 'react-router-dom';
import Modal from 'react-responsive-modal';
import csv from 'csvtojson';
import { callbackify } from 'util';
import { FormattedMessage } from 'react-intl';
import styled from '@emotion/styled';
import fs from 'fs';

// Internal Global Dependencies
import config from 'api/configuration';
import * as RPC from 'scripts/rpc';
import * as TYPE from 'actions/actiontypes';
import * as actionsCreators from 'actions/addressbookActionCreators';
import Icon from 'components/common/Icon';
import Button from 'components/common/Button';
import { WrappedTextBox } from 'components/common/TextBox';
import Panel from 'components/common/Panel';
import WaitingText from 'components/common/WaitingText';
import ContextMenuBuilder from 'contextmenu';

// Internal Local Dependencies
import TimeZoneSelector from './timeZoneSelector';
import styles from './style.css';
// import messages from 'languages/messages'

// Images
import profilePlaceholder from 'images/Profile_Placeholder.png';
import addressBookIcon from 'images/address-book.sprite.svg';
import exportIcon from 'images/export.sprite.svg';
import addContactIcon from 'images/add-contact.sprite.svg';
import searchIcon from 'images/search.sprite.svg';
import userIcon from 'images/user.sprite.svg';

const ControlIcon = styled(Icon)({
  width: 20,
  height: 20,
});

// React-Redux mandatory methods
const mapStateToProps = state => {
  return {
    ...state.common,
    ...state.addressbook,
    ...state.overview,
    ...state.sendReceive,
    ...state.settings,
  };
};
const mapDispatchToProps = dispatch =>
  bindActionCreators(actionsCreators, dispatch);

class AddressBook extends Component {
  // React Method (Life cycle hook)
  componentDidMount() {
    this.loadMyAccounts();
    this.addressbookContextMenu = this.addressbookContextMenu.bind(this);
    window.addEventListener('contextmenu', this.addressbookContextMenu, false);
    this.props.googleanalytics.SendScreen('AddressBook');
  }
  // React Method (Life cycle hook)
  componentWillUnmount() {
    window.removeEventListener('contextmenu', this.addressbookContextMenu);
  }
  // React Method (Life cycle hook)
  componentDidUpdate(previousprops) {
    if (this.props.save) {
      config.WriteJson('addressbook.json', {
        addressbook: this.props.addressbook,
      });
      this.props.ToggleSaveFlag();
    }
  }

  // Class methods
  addressbookContextMenu() {
    const txtTemplate = [
      {
        label: this.props.messages['Settings.Copy'],
        accelerator: 'CmdOrCtrl+C',
        role: 'copy',
      },
      {
        label: this.props.messages['Settings.Paste'],
        accelerator: 'CmdOrCtrl+V',
        role: 'paste',
      },
    ];

    const acctTemplate = [
      {
        label: this.props.messages['Settings.Copy'],
        accelerator: 'CmdOrCtrl+C',
        role: 'copy',
      },
      {
        label: this.props.messages['Settings.Paste'],

        accelerator: 'CmdOrCtrl+V',
        role: 'paste',
      },
      {
        label: this.props.messages['AddressBook.DeleteContact'],

        click(item, focusedWindow) {
          deleteAccountCallback();
        },
      },
    ];

    let deleteAccountCallback = () => {
      if (
        confirm(
          `${this.props.messages['AddressBook.AreYouSureDelete']} ${
            this.props.addressbook[this.props.actionItem].name
          }?`
        )
      ) {
        this.props.DeleteContact(this.props.actionItem);
      }
    };

    const addTemplate = [
      {
        label: this.props.messages['Settings.Copy'],
        accelerator: 'CmdOrCtrl+C',
        role: 'copy',
      },
      {
        label: this.props.messages['Settings.Paste'],
        accelerator: 'CmdOrCtrl+V',
        role: 'paste',
      },
      {
        label: this.props.messages['AddressBook.DeleteAddress'],
        click(item, focusedWindow) {
          deleteAddressCallback();
        },
      },
    ];
    let deleteAddressCallback = () => {
      if (
        confirm(
          `${this.props.messages['AddressBook.ThisAddress']}? ${
            this.props.addressbook[this.props.selected][
              this.props.actionItem.type
            ][this.props.actionItem.index].address
          }`
        )
      ) {
        this.props.DeleteAddress(this.props.actionItem, this.props.selected);
      }
    };
    let addresscontextmenu = new remote.Menu();
    const contextmenu = new ContextMenuBuilder().defaultContext;
    let defaultcontextmenu = remote.Menu.buildFromTemplate(contextmenu);
    let acctMenu = remote.Menu.buildFromTemplate(acctTemplate);
    let txtMenu = remote.Menu.buildFromTemplate(txtTemplate);
    let addMenu = remote.Menu.buildFromTemplate(addTemplate);

    switch (this.props.hoveredOver) {
      case 'account':
        acctMenu.popup(remote.getCurrentWindow());
        break;
      case 'address':
        addMenu.popup(remote.getCurrentWindow());
        break;
      case 'text':
        txtMenu.popup(remote.getCurrentWindow());
        break;
      default:
        defaultcontextmenu.popup(remote.getCurrentWindow());
        break;
    }
  }

  loadMyAccounts() {
    RPC.PROMISE('listaccounts', [0]).then(payload => {
      Promise.all(
        Object.keys(payload).map(account =>
          RPC.PROMISE('getaddressesbyaccount', [account])
        )
      ).then(payload => {
        let validateAddressPromises = [];

        payload.map(element => {
          element.addresses.map(address => {
            validateAddressPromises.push(
              RPC.PROMISE('validateaddress', [address])
            );
          });
        });

        Promise.all(validateAddressPromises).then(payload => {
          let accountsList = [];
          let myaccts = payload.map(e => {
            if (e.ismine && e.isvalid) {
              let index = accountsList.findIndex(ele => {
                if (ele.account === e.account) {
                  return ele;
                }
              });
              let indexDefault = accountsList.findIndex(ele => {
                if (ele.account == '' || ele.account == 'default') {
                  return ele;
                }
              });

              if (e.account === '' || e.account === 'default') {
                if (index === -1 && indexDefault === -1) {
                  accountsList.push({
                    account: 'default',
                    addresses: [e.address],
                  });
                } else {
                  accountsList[indexDefault].addresses.push(e.address);
                }
              } else {
                if (index === -1) {
                  accountsList.push({
                    account: e.account,
                    addresses: [e.address],
                  });
                } else {
                  accountsList[index].addresses.push(e.address);
                }
              }
            }
          });
          this.props.MyAccountsList(accountsList);
        });
      });
    });
  }

  getinitial(name) {
    if (name && name.length >= 1) return name.charAt(0);
    return 'M';
  }

  copyaddress(event) {
    event.preventDefault();
    let target = event.currentTarget;
    let address = event.target.innerText;

    // create a temporary input element and add it to the list item (no one will see it)
    let input = document.createElement('input');
    input.type = 'text';
    target.appendChild(input);

    // set the value of the input to the selected address, then focus and select it
    input.value = address;
    input.focus();
    input.select();

    // copy it to clipboard
    document.execCommand('Copy', false, null);

    // remove the temporary element from the DOM
    input.remove();
    if (this.props.modalVisable) {
      this.props.ToggleModal();
    }
    this.props.OpenModal('Copied');
    setTimeout(() => {
      if (this.props.open) {
        this.props.CloseModal();
      }
    }, 3000);
  }

  MyAddressesTable() {
    let filteredAddress = this.props.myAccounts.filter(acct => {
      if (acct.account === '') {
        let dummie = this.props.messages['AddressBook.MyAccount'];
        return (
          dummie.toLowerCase().indexOf(this.props.Search.toLowerCase()) !== -1
        );
      } else {
        return (
          acct.account
            .toLowerCase()
            .indexOf(this.props.Search.toLowerCase()) !== -1
        );
      }
    });
    return (
      <div id="Addresstable-wraper">
        {filteredAddress.map((acct, i) => {
          return (
            <tr>
              <td key={acct + i} className="tdAccounts">
                {acct.account === '' ? (
                  <span>{this.props.messages['AddressBook.MyAccount']}</span>
                ) : (
                  acct.account
                )}
              </td>
              {acct.addresses.map(address => {
                return (
                  <td className="tdd" key={address + i}>
                    <span onClick={event => this.copyaddress(event)}>
                      {address}
                    </span>
                    <span key={address + i} className="tooltip">
                      {this.props.messages['AddressBook.Copy']}
                    </span>
                  </td>
                );
              })}
            </tr>
          );
        })}
      </div>
    );
  }

  modalInternalBuilder() {
    let index = this.props.addressbook.findIndex(ele => {
      if (ele.name === this.props.prototypeName) {
        return ele;
      }
    });

    switch (this.props.modalType) {
      case 'ADD_CONTACT':
        return (
          <div id="modalInternal">
            {index === -1 ? (
              <h2 className="m1">
                <Icon icon={addressBookIcon} className="hdr-img" />
                <FormattedMessage
                  id="AddressBook.addContact"
                  defaultMessage="Add Contact"
                />
              </h2>
            ) : (
              <h2 className="m1">
                <Icon icon={addressBookIcon} className="hdr-img" />
                <FormattedMessage
                  id="AddressBook.EditContact"
                  defaultMessage="Edit Contact"
                />
              </h2>
            )}

            <div className="field">
              <label htmlFor="new-account-name">
                <FormattedMessage id="AddressBook.Name" defaultMessage="Name" />
              </label>
              <FormattedMessage id="AddressBook.Name" defaultMessage="Name">
                {n => (
                  <input
                    id="new-account-name"
                    type="text"
                    value={this.props.prototypeName}
                    onChange={e => this.props.EditProtoName(e.target.value)}
                    placeholder={n}
                    required
                  />
                )}
              </FormattedMessage>
            </div>
            <div className="field">
              <label htmlFor="new-account-name">
                <FormattedMessage
                  id="AddressBook.Phone"
                  defaultMessage="Phone #"
                />
              </label>
              <FormattedMessage id="AddressBook.Phone" defaultMessage="Phone #">
                {p => (
                  <input
                    id="new-account-phone"
                    type="tel"
                    onChange={e => this.phoneNumberHandler(e.target.value)}
                    value={this.props.prototypePhoneNumber}
                    placeholder={p}
                  />
                )}
              </FormattedMessage>
            </div>
            <div className="contact-detail">
              <label>
                <FormattedMessage
                  id="AddressBook.LocalTime"
                  defaultMessage="Local Time"
                />
              </label>
              <TimeZoneSelector />
            </div>

            <div className="field">
              <label htmlFor="new-account-notes">
                <FormattedMessage
                  id="AddressBook.Notes"
                  defaultMessage="Notes"
                />
              </label>
              <textarea
                id="new-account-notes"
                onChange={e => this.props.EditProtoNotes(e.target.value)}
                value={this.props.prototypeNotes}
                rows="3"
              />
            </div>

            <div className="field">
              <label htmlFor="nxsaddress">
                <FormattedMessage
                  id="AddressBook.NXSAddress"
                  defaultMessage="NXS Address"
                />
              </label>
              <FormattedMessage
                id="AddressBook.NXSAddress"
                defaultMessage="NXS Address"
              >
                {na => (
                  <input
                    id="nxsaddress"
                    type="text"
                    onChange={e => this.props.EditProtoAddress(e.target.value)}
                    value={this.props.prototypeAddress}
                    placeholder={na}
                  />
                )}
              </FormattedMessage>
            </div>

            <button
              className="button primary"
              id="modalAddOrEditContact"
              onClick={() => {
                let name = this.props.prototypeName.trim();
                if (name !== '*' && name !== 'default') {
                  this.props.AddContact(
                    this.props.prototypeName,
                    this.props.prototypeAddress,
                    this.props.prototypePhoneNumber,
                    this.props.prototypeNotes,
                    this.props.prototypeTimezone
                  );
                } else {
                  this.props.OpenModal('Account cannot be named * or default');
                }
              }}
            >
              {index === -1 ? (
                <FormattedMessage
                  id="AddressBook.addContact"
                  defaultMessage="Add Contact"
                />
              ) : (
                <FormattedMessage
                  id="AddressBook.EditContact"
                  defaultMessage="Edit Contact"
                />
              )}
            </button>
            <button className="button" onClick={() => this.props.ToggleModal()}>
              <FormattedMessage
                id="AddressBook.Cancel"
                defaultMessage="Cancel"
              />
            </button>
          </div>
        );
        break;
      case 'MY_ADDRESSES':
        if (this.props.myAccounts.length > 0) {
          return (
            <div id="Addresstable-wraper">
              <h2 className="m1">
                <Icon icon={addressBookIcon} className="hdr-img" />
                <FormattedMessage
                  id="AddressBook.MyAddresses"
                  defaultMessage="My Addresses"
                />
              </h2>
              <table className="myAddressTable">
                <thead className="AddressThead">
                  <th className="short-column">
                    <FormattedMessage
                      id="AddressBook.Account"
                      defaultMessage="Account"
                    />
                    <FormattedMessage
                      id="AddressBook.searchC"
                      defaultMessage="Search Account"
                    >
                      {sba => (
                        <input
                          className="searchaccount"
                          type="text"
                          placeholder={sba}
                          value={this.props.Search}
                          onChange={e => this.props.SearchName(e.target.value)}
                          required
                        />
                      )}
                    </FormattedMessage>
                  </th>
                </thead>
                {this.MyAddressesTable()}
              </table>
              <button
                className="button primary"
                onClick={() => this.props.SetModalType('NEW_MY_ADDRESS')}
              >
                <FormattedMessage
                  id="AddressBook.CreateAddress"
                  defaultMessage="Create New Address"
                />
              </button>
            </div>
          );
        } else
          return (
            <h2>
              <FormattedMessage
                id="AddressBook.Loading"
                defaultMessage="Please wait for the daemon to load"
              />
            </h2>
          );
        break;
      case 'ADD_ADDRESS':
        return (
          <div>
            <h2 className="m1">
              <Icon icon={addressBookIcon} className="hdr-img" />
              <FormattedMessage
                id="AddressBook.AddAddressTO"
                defaultMessage="Add Address To"
              />
              <span className="chosen">
                ({this.props.addressbook[this.props.selected].name})
              </span>
            </h2>
            <div className="create2">
              <label htmlFor="nxsaddress">
                <FormattedMessage
                  id="AddressBook.NXSAddress"
                  defaultMessage="Nexus Address"
                />
              </label>
              <FormattedMessage
                id="AddressBook.NXSAddress"
                defaultMessage="Nexus Address"
              >
                {na => (
                  <input
                    id="new-account-name"
                    type="text"
                    onChange={e => this.props.EditProtoAddress(e.target.value)}
                    value={this.props.prototypeAddress}
                    placeholder={na}
                  />
                )}
              </FormattedMessage>
            </div>

            <button
              id="Add"
              className="button primary"
              onClick={() => {
                this.props.AddAddress(
                  this.props.addressbook[this.props.selected].name,
                  this.props.prototypeAddress,
                  this.props.selected
                );
              }}
            >
              <FormattedMessage
                id="AddressBook.AddAddress"
                defaultMessage="Add Address"
              />
            </button>
            <button
              id="back"
              className="button"
              onClick={() => this.props.ToggleModal()}
            >
              <FormattedMessage
                id="AddressBook.Cancel"
                defaultMessage="Cancel"
              />
            </button>
          </div>
        );
        break;
      case 'NEW_MY_ADDRESS':
        return (
          <div>
            <h2 className="m1">
              <Icon icon={addressBookIcon} className="hdr-img" />
              <FormattedMessage
                id="AddressBook.Create"
                defaultMessage="Create"
              />
            </h2>
            <div className="create">
              <label htmlFor="new-account-name">
                <FormattedMessage
                  id="AddressBook.NameOption"
                  defaultMessage="Name (Optional)"
                />
              </label>
              <FormattedMessage id="AddressBook.Name" defaultMessage="Name">
                {ean => (
                  <input
                    id="new-account-name"
                    type="text"
                    value={this.props.prototypeName}
                    onChange={e => this.props.EditProtoName(e.target.value)}
                    placeholder={ean}
                    required
                  />
                )}
              </FormattedMessage>
            </div>{' '}
            <button
              id="Add"
              className="ghost button"
              onClick={() => this.createAddress()}
            >
              <FormattedMessage
                id="AddressBook.CreateAddress"
                defaultMessage="Create New Address"
              />
            </button>
            <button
              id="back"
              className="button ghost"
              onClick={() => this.props.SetModalType('MY_ADDRESSES')}
            >
              <FormattedMessage id="AddressBook.Back" defaultMessage="Back" />
            </button>
          </div>
        );
        break;
      default:
        break;
    }
  }

  createAddress() {
    let name = this.props.prototypeName.trim();
    if (name !== '') {
      if (name !== '*' && name !== 'default') {
        RPC.PROMISE('getnewaddress', [name])
          .then(success => {
            this.props.ToggleModal();
            this.loadMyAccounts();
          })
          .catch(e => {
            alert(e);
          });
      } else {
        this.props.OpenModal('Account cannot be named * or default');
      }
    } else {
      RPC.PROMISE('getnewaddress', [''])
        .then(success => {
          this.props.ToggleModal();
          this.loadMyAccounts();
        })
        .catch(e => {
          alert(e);
        });
    }
  }

  contactLister() {
    let filteredAddress = this.props.addressbook.map((contact, i) => {
      if (
        contact.name
          .toLowerCase()
          .indexOf(this.props.contactSearch.toLowerCase()) !== -1
      ) {
        return `${contact.name}`;
      }
    });

    if (this.props.addressbook[0]) {
      return (
        <div
          id="contactList"
          onMouseOverCapture={() => this.props.SetMousePosition('', '')}
        >
          {this.props.addressbook.map((contact, i) => {
            let addTotal = contact.mine.length + contact.notMine.length;
            if (filteredAddress.includes(contact.name)) {
              return (
                <div
                  key={i}
                  id={i}
                  onClick={() => this.props.SelectedContact(i)}
                  onMouseOverCapture={e => {
                    this.props.SetMousePosition('account', i);
                  }}
                  className="contact"
                >
                  <span className="contact-avatar">
                    <svg viewBox="0 0 100 100">
                      <text x="50" y="50" dy=".35em">
                        {this.getinitial(contact.name)}
                      </text>
                    </svg>
                  </span>
                  <span className="contact-name">{contact.name}</span>
                  <span className="contactAddresses">
                    {addTotal}{' '}
                    {addTotal > 1
                      ? this.props.messages['AddressBook.Addresses']
                      : this.props.messages['AddressBook.Address']}
                  </span>
                </div>
              );
            } else {
              return null;
            }
          })}
        </div>
      );
    }
  }

  phoneFormatter() {
    let num = this.props.addressbook[this.props.selected].phoneNumber;
    if (num.length === 12) {
      return `+ ${num.substring(0, 2)} ${num.substring(2, 4)} ${num.substring(
        4,
        8
      )} ${num.substring(8, 12)}`;
    } else if (num.length === 10) {
      return `(${num.substring(0, 3)}) ${num.substring(3, 6)}-${num.substring(
        6,
        10
      )}`;
    } else return num;
  }

  localTimeFormater() {
    let d = new Date();
    let utc = new Date().getTimezoneOffset();

    d.setMinutes(d.getMinutes() + utc);
    d.setMinutes(
      d.getMinutes() +
        parseInt(this.props.addressbook[this.props.selected].timezone)
    );

    let h = d.getHours();
    let m = d.getMinutes();
    let i = 'AM';
    if (h >= 12) {
      i = 'PM';
      h = h - 12;
    }
    if (h === 0) {
      h = '12';
    }
    if (m <= 9) {
      m = `0${m}`;
    }

    return (
      <div>
        <span
          onDoubleClick={() => {
            if (this.props.editTZ) {
              this.props.SaveTz(
                this.props.selected,
                this.props.prototypeTimezone
              );
            } else {
              this.props.TzToggler(
                this.props.addressbook[this.props.selected].timezone
              );
            }
          }}
          onKeyDown={e => {
            if (e.which === 13 || e.which === 9) {
              this.props.SaveTz(
                this.props.selected,
                this.props.prototypeTimezone
              );
            }
          }}
        >
          {' '}
          <FormattedMessage
            id="AddressBook.LocalTime"
            defaultMessage="Local Time"
          />
          :
        </span>{' '}
        {this.props.editTZ === true ? (
          <TimeZoneSelector />
        ) : (
          <span
            onDoubleClick={() =>
              this.props.TzToggler(
                this.props.addressbook[this.props.selected].timezone
              )
            }
          >
            {h}:{m} {i}
          </span>
        )}
      </div>
    );
  }

  theirAddressLister() {
    return (
      <div>
        <h3>
          <FormattedMessage
            id="AddressBook.TheirAddresses"
            defaultMessage="Their Addresses"
          />
        </h3>
        <div>
          {this.props.addressbook[this.props.selected].notMine.map((add, i) => {
            return (
              <div
                onContextMenu={e => {
                  this.props.SetMousePosition('address', {
                    index: i,
                    type: 'notMine',
                  });
                }}
                key={i + add.address}
              >
                {this.props.editAddressLabel === add.address ? (
                  <input
                    className="editFeildDoNotClose"
                    onChange={e => this.props.EditProtoLabel(e.target.value)}
                    value={this.props.prototypeAddressLabel}
                    onDoubleClick={() =>
                      this.props.SaveLabel(
                        this.props.selected,
                        add.address,
                        this.props.prototypeAddressLabel,
                        false
                      )
                    }
                    onKeyDown={e => {
                      if (e.which === 13 || e.which === 9) {
                        this.props.SaveLabel(
                          this.props.selected,
                          add.address,
                          this.props.prototypeAddressLabel,
                          false
                        );
                      }
                    }}
                  />
                ) : (
                  <span
                    onDoubleClick={() => {
                      if (add.label === "'s Address") {
                        this.props.LabelToggler(
                          this.props.addressbook[this.props.selected].name +
                            add.label,
                          add.address
                        );
                      } else {
                        this.props.LabelToggler(add.label, add.address);
                      }
                    }}
                  >
                    {add.label === "'s Address"
                      ? `${
                          this.props.addressbook[this.props.selected].name
                        }${"'s"}${'  '}${
                          this.props.messages['AddressBook.Address']
                        }`
                      : add.label}
                    :
                  </span>
                )}
                <div onClick={event => this.copyaddress(event)}>
                  {add.address}
                </div>
                <span className="tooltip">
                  <FormattedMessage
                    id="AddressBook.Copy"
                    defaultMessage="Click To Copy"
                  />
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  myAddressLister() {
    return (
      <div id="myAddresses">
        <h3>
          <FormattedMessage
            id="AddressBook.MyAddresses"
            defaultMessage="My Addresses"
          />
        </h3>
        <div>
          {this.props.addressbook[this.props.selected].mine.map((add, i) => {
            return (
              <div
                onContextMenu={e => {
                  this.props.SetMousePosition('address', {
                    index: i,
                    type: 'mine',
                  });
                }}
                key={i + add.address}
              >
                {this.props.editAddressLabel === add.address ? (
                  <input
                    className="editFeildDoNotClose"
                    onChange={e => this.props.EditProtoLabel(e.target.value)}
                    value={this.props.prototypeAddressLabel}
                    onDoubleClick={() =>
                      this.props.SaveLabel(
                        this.props.selected,
                        add.address,
                        this.props.prototypeAddressLabel,
                        true
                      )
                    }
                    onKeyDown={e => {
                      if (e.which === 13 || e.which === 9) {
                        this.props.SaveLabel(
                          this.props.selected,
                          add.address,
                          this.props.prototypeAddressLabel,
                          true
                        );
                      }
                    }}
                  />
                ) : (
                  <span
                    onDoubleClick={() => {
                      if (add.label === 'My Address for ') {
                        this.props.LabelToggler(
                          add.label +
                            this.props.addressbook[this.props.selected].name,
                          add.address
                        );
                      } else {
                        this.props.LabelToggler(add.label, add.address);
                      }
                    }}
                  >
                    {add.label === 'My Address for '
                      ? `${add.label}${
                          this.props.addressbook[this.props.selected].name
                        }`
                      : add.label}
                    :
                  </span>
                )}
                <div onClick={event => this.copyaddress(event)}>
                  {add.address}{' '}
                </div>
              </div>
            );
          })}{' '}
          <span className="tooltip">
            <FormattedMessage
              id="AddressBook.Copy"
              defaultMessage="Click To Copy"
            />
          </span>
        </div>
      </div>
    );
  }

  addAddressHandler() {
    this.props.SetModalType('ADD_ADDRESS');
    this.props.ToggleModal();
  }

  showAddContactModal() {
    this.props.SetModalType('ADD_CONTACT');
    this.props.ToggleModal();
  }

  showMyAddresses() {
    this.props.SetModalType('MY_ADDRESSES');
    this.props.ToggleModal();
  }

  phoneNumberHandler(value) {
    if (/^[0-9.]+$/.test(value) | (value === '')) {
      this.props.EditProtoPhone(value);
    } else {
      return null;
    }
  }

  exportAddressBook() {
    this.props.googleanalytics.SendEvent(
      'AddressBook',
      'IOAddress',
      'Export',
      1
    );

    const rows = []; //Set up a blank array for each row
    let csvContent = 'data:text/csv;charset=utf-8,'; //Set formating
    //This is so we can have named columns in the export, this will be row 1
    let NameEntry = [
      'AccountName', //a
      'PhoneNumber', //b
      'TimeZone', //c
      'Notes', //d
    ];
    rows.push(NameEntry); //how we get our header line
    this.props.addressbook.map(e => {
      let tempentry = [];
      tempentry.push(e.name);
      tempentry.push(e.phoneNumber);

      tempentry.push(e.timezone);
      tempentry.push(e.notes);
      // rows.push(tempentry); // moving down.
      let tempMine = [];

      let tempNotMine = [];
      if (e.mine.length > 0) {
        e.mine.map(add => {
          let label = '';
          if (add.label === 'My Address for ') {
            label = add.label + e.name;
          } else {
            label = add.label;
          }
          tempMine.push([label, add.address]);
        });
        // rows.push(["", `My addresses for ${e.name}`, "", "", ""]);
        // rows.push(tempMine);
        tempentry.push(tempMine);
      }
      if (e.notMine.length > 0) {
        e.notMine.map(add => {
          let label = '';

          if (add.label === "'s Address") {
            label = e.name + add.label;
          } else {
            label = add.label;
          }
          tempNotMine.push([label, add.address]);
        });
        // rows.push(["", `${e.name}'s addresses`, "", "", ""]);
        // rows.push(tempNotMine);
        tempentry.push(tempNotMine);
      }
      rows.push(tempentry);
    });

    rows.forEach(function(rowArray) {
      let row = rowArray.join(',');
      csvContent += row + '\r\n';
    }); //format each row
    let encodedUri = encodeURI(csvContent); //Set up a uri, in Javascript we are basically making a Link to this file
    let link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'nexus-addressbook.csv'); //give link an action and a default name for the file. MUST BE .csv

    document.body.appendChild(link); // Required for FF

    link.click();

    document.body.removeChild(link);
  }

  importAddressBook(path) {
    this.props.googleanalytics.SendEvent(
      'AddressBook',
      'IOAddress',
      'Import',
      1
    );
    console.log(csv().fromFile(path));
    csv()
      .fromFile(path)
      .then(jsonObj => {
        for (var i = 0; i < jsonObj.length; i++) {
          // dispatch a new account... (map it )
          var name = jsonObj[i].AccountName;
          var phone = jsonObj[i].PhoneNumber;
          var notes = jsonObj[i].Notes;
          var tz = jsonObj[i].TimeZone;
          var label;
          var address;
          for (var k in jsonObj[i]) {
            var key = k;
            var val = jsonObj[i][k];

            if (key.includes('field')) {
              var num = key.slice(5, key.length);
              if (num % 2 == 1) {
                label = val;
              } else {
                address = val;
                // (name, address, num, notes, TZ)
                this.props.AddContact(name, address, phone, notes, tz);
                // so here is where we have unique address label pairs, we should add this now.
                // also we don't really know how they had things labeled so we should check to see if they are ours or not.
                label = '';
                address = '';
              }
            }
          }
        }
      });
  }

  closeEdit(e) {
    if (e.target.className !== 'editFeildDoNotClose') {
      if (this.props.editName) {
        if (this.props.prototypeName !== '') {
          this.props.SaveName(this.props.selected, this.props.prototypeName);
        }
      } else if (this.props.editPhone) {
        this.props.SavePhone(
          this.props.selected,
          this.props.prototypePhoneNumber
        );
      } else if (this.props.editNotes) {
        this.props.SaveNotes(this.props.selected, this.props.prototypeNotes);
      } else if (this.props.editTZ) {
        this.props.SaveTz(this.props.selected, this.props.prototypeTimezone);
      } else if (this.props.prototypeAddressLabel !== '') {
        RPC.PROMISE('validateaddress', [this.props.editAddressLabel]).then(
          payload => {
            this.props.SaveLabel(
              this.props.selected,
              this.props.editAddressLabel,
              this.props.prototypeAddressLabel,
              payload.ismine
            );
          }
        );
      }
    }
  }

  // Mandatory React method
  render() {
    return (
      <Panel
        icon={addressBookIcon}
        title={
          <FormattedMessage
            id="AddressBook.AddressBook"
            defaultMessage="Address Book"
          />
        }
        controls={
          !!this.props.connections && (
            <div className="flex center">
              <Button
                blank
                className="relative"
                onClick={this.showAddContactModal.bind(this)}
              >
                <ControlIcon icon={addContactIcon} />
                <div className="tooltip bottom">
                  <FormattedMessage
                    id="AddressBook.addContact"
                    defaultMessage="Add Contact"
                  />
                </div>
              </Button>
              <Button
                blank
                className="relative"
                as="a"
                onClick={this.exportAddressBook.bind(this)}
              >
                <ControlIcon icon={exportIcon} />
                <div className="tooltip bottom">
                  <FormattedMessage
                    id="AddressBook.Export"
                    defaultMessage="Export"
                  />
                </div>
              </Button>
              <Button
                blank
                className="relative"
                as="a"
                onClick={() => {
                  this.props.clearSearch();
                  this.loadMyAccounts();
                  this.showMyAddresses();
                }}
              >
                <ControlIcon icon={userIcon} />
                <div className="tooltip bottom">
                  <FormattedMessage
                    id="AddressBook.MyAddresses"
                    defaultMessage="My Addresses"
                  />
                </div>
              </Button>
              <FormattedMessage
                id="AddressBook.SearchContact"
                defaultMessage="Search Contact"
              >
                {sc => (
                  <WrappedTextBox
                    style={{
                      marginLeft: '1em',
                      fontSize: '.9375em',
                      width: 200,
                    }}
                    tailIcon={searchIcon}
                    inputProps={{
                      placeholder: sc,
                      value: this.props.contactSearch,
                      onChange: e => this.props.ContactSearch(e.target.value),
                    }}
                  />
                )}
              </FormattedMessage>
            </div>
          )
        }
      >
        <Modal
          open={this.props.modalVisable}
          center
          onClose={this.props.ToggleModal}
          classNames={{ modal: 'custom-modal4' }}
          onExited={this.props.clearPrototype}
        >
          {this.modalInternalBuilder()}
        </Modal>

        {this.props.connections === undefined ? (
          <WaitingText>
            <FormattedMessage
              id="AddressBook.Loading"
              defaultMessage="Please wait for the daemon to load"
            />
            ...
          </WaitingText>
        ) : (
          <div>
            {this.props.addressbook.length > 0 ? (
              <div id="addressbookContent">
                <div id="contactListContainer">{this.contactLister()}</div>
                {this.props.addressbook[this.props.selected].mine && (
                  <div id="contactDetailContainer">
                    <fieldset id="contactDetails">
                      <legend>
                        {this.props.editName === true ? (
                          <FormattedMessage
                            id="AddressBook.Name"
                            defaultMessage="Name"
                          >
                            {n => (
                              <input
                                id="new-account-name"
                                className="editFeildDoNotClose"
                                type="text"
                                value={this.props.prototypeName}
                                onChange={e =>
                                  this.props.EditProtoName(e.target.value)
                                }
                                onKeyDown={e => {
                                  if (e.which === 13 || e.which === 9) {
                                    if (this.props.prototypeName !== '') {
                                      this.props.SaveName(
                                        this.props.selected,
                                        this.props.prototypeName
                                      );
                                    }
                                  }
                                }}
                                placeholder={n}
                                onDoubleClick={e => {
                                  if (this.props.prototypeName !== '') {
                                    this.props.SaveName(
                                      this.props.selected,
                                      this.props.prototypeName
                                    );
                                  }
                                }}
                              />
                            )}
                          </FormattedMessage>
                        ) : (
                          <span
                            onDoubleClick={() =>
                              this.props.NameToggler(
                                this.props.addressbook[this.props.selected].name
                              )
                            }
                          >
                            {this.props.addressbook[this.props.selected].name}
                          </span>
                        )}{' '}
                        <div className="tooltip">
                          <FormattedMessage
                            id="AddressBook.ClickToEdit"
                            defaultMessage="Doubleclick To Edit"
                          />
                        </div>
                      </legend>
                      <div id="contactInformation">
                        <div>
                          <div>
                            {' '}
                            <label
                              onDoubleClick={() =>
                                this.props.PhoneToggler(
                                  this.props.addressbook[this.props.selected]
                                    .phoneNumber
                                )
                              }
                              htmlFor="phoneNumber"
                            >
                              <FormattedMessage
                                id="AddressBook.PhoneNumber"
                                defaultMessage="Phone Number"
                              />
                            </label>
                            {this.props.editPhone === true ? (
                              <FormattedMessage
                                id="AddressBook.Phone"
                                defaultMessage="Phone #"
                              >
                                {p => (
                                  <input
                                    id="phoneNumber"
                                    name="phoneNumber"
                                    className="editFeildDoNotClose"
                                    type="tel"
                                    onChange={e =>
                                      this.phoneNumberHandler(e.target.value)
                                    }
                                    onKeyDown={e => {
                                      if (e.which === 13 || e.which === 9) {
                                        this.props.SavePhone(
                                          this.props.selected,
                                          this.props.prototypePhoneNumber
                                        );
                                      }
                                    }}
                                    value={this.props.prototypePhoneNumber}
                                    placeholder={p}
                                    onDoubleClick={() =>
                                      this.props.SavePhone(
                                        this.props.selected,
                                        this.props.prototypePhoneNumber
                                      )
                                    }
                                  />
                                )}
                              </FormattedMessage>
                            ) : (
                              <span
                                onDoubleClick={() =>
                                  this.props.PhoneToggler(
                                    this.props.addressbook[this.props.selected]
                                      .phoneNumber
                                  )
                                }
                                id="phoneNumber"
                              >
                                {' '}
                                {this.phoneFormatter()}
                              </span>
                            )}
                            <span className="tooltip">
                              <FormattedMessage
                                id="AddressBook.ClickToEdit"
                                defaultMessage="Doubleclick To Edit"
                              />
                            </span>
                          </div>
                          {this.localTimeFormater()}
                          <div id="notesContainer">
                            <label
                              onDoubleClick={() =>
                                this.props.NotesToggler(
                                  this.props.addressbook[this.props.selected]
                                    .notes
                                )
                              }
                              htmlFor="notes"
                            >
                              <FormattedMessage
                                id="AddressBook.Notes"
                                defaultMessage="Notes"
                              />
                              :
                            </label>
                            {this.props.editNotes === true ? (
                              <div>
                                <textarea
                                  id="notes"
                                  name="notes"
                                  className="editFeildDoNotClose"
                                  onDoubleClick={() =>
                                    this.props.SaveNotes(
                                      this.props.selected,
                                      this.props.prototypeNotes
                                    )
                                  }
                                  onKeyDown={e => {
                                    if (e.which === 13 || e.which === 9) {
                                      this.props.SaveNotes(
                                        this.props.selected,
                                        this.props.prototypeNotes
                                      );
                                    }
                                  }}
                                  onChange={e =>
                                    this.props.EditProtoNotes(e.target.value)
                                  }
                                  value={this.props.prototypeNotes}
                                  rows="3"
                                />
                              </div>
                            ) : (
                              <div
                                id="notes"
                                name="notes"
                                onDoubleClick={() =>
                                  this.props.NotesToggler(
                                    this.props.addressbook[this.props.selected]
                                      .notes
                                  )
                                }
                              >
                                {
                                  this.props.addressbook[this.props.selected]
                                    .notes
                                }
                              </div>
                            )}
                            <span className="tooltip">
                              <FormattedMessage
                                id="AddressBook.ClickToEdit"
                                defaultMessage="Doubleclick To Edit"
                              />
                            </span>
                          </div>
                        </div>
                        {this.props.addressbook[this.props.selected].imgSrc !==
                          undefined &&
                        fs.existsSync(
                          this.props.addressbook[this.props.selected].imgSrc
                        ) ? (
                          <label htmlFor="picUploader">
                            <img
                              src={
                                this.props.addressbook[this.props.selected]
                                  .imgSrc
                              }
                            />
                          </label>
                        ) : (
                          <label htmlFor="picUploader">
                            <img src={profilePlaceholder} />
                          </label>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          name="picUploader"
                          onChange={e => {
                            if (e.target.files[0]) {
                              this.props.ChangeContactImage(
                                e.target.files[0].path,
                                this.props.selected
                              );
                            }
                          }}
                          id="picUploader"
                        />
                      </div>
                    </fieldset>
                    <div
                      id="addressDisplay"
                      onMouseOverCapture={() =>
                        this.props.SetMousePosition('', '')
                      }
                    >
                      {this.props.addressbook[this.props.selected].notMine
                        .length > 0
                        ? this.theirAddressLister()
                        : null}
                      {this.props.addressbook[this.props.selected].mine.length >
                      0
                        ? this.myAddressLister()
                        : null}
                    </div>
                    <div id="buttonholder">
                      <button
                        className="button ghost hero"
                        onClick={() => this.addAddressHandler()}
                      >
                        <FormattedMessage
                          id="AddressBook.AddAddress"
                          defaultMessage="Add Address"
                        />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ marginTop: 50, textAlign: 'center' }}>
                <div className="dim" style={{ marginBottom: '1em' }}>
                  Your Address Book is empty!
                </div>
                <Button blank onClick={this.showAddContactModal.bind(this)}>
                  <Icon icon={addContactIcon} />
                  &nbsp; Add Contact
                </Button>
              </div>
            )}
          </div>
        )}
      </Panel>
    );
  }
}

// Mandatory React-Redux method
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AddressBook);
