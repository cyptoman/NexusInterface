// External
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { reduxForm, Field, FieldArray, formValueSelector } from 'redux-form';
import styled from '@emotion/styled';

// Internal Global
import { apiPost } from 'lib/tritiumApi';
import rpc from 'lib/rpc';
import { defaultSettings } from 'lib/settings';
import { loadMyAccounts } from 'actions/account';
import Icon from 'components/Icon';
import Button from 'components/Button';
import TextField from 'components/TextField';
import Select from 'components/Select';
import FormField from 'components/FormField';
import {
  openConfirmDialog,
  openErrorDialog,
  openSuccessDialog,
  removeModal,
  openModal,
} from 'actions/overlays';
import Link from 'components/Link';
import { errorHandler } from 'utils/form';
import sendIcon from 'images/send.sprite.svg';
import { numericOnly } from 'utils/form';
import confirmPin from 'utils/promisified/confirmPin';

import PinDialog from 'components/PinDialog';

// Internal Local
import Recipients from './Recipients';
import {
  getAccountOptions,
  getAddressNameMap,
  getRegisteredFieldNames,
  getAccountBalance,
} from './selectors';
import PasswordModal from './PasswordModal';

const SendFormComponent = styled.form({
  maxWidth: 800,
  margin: '-.5em auto 0',
});

const SendFormButtons = styled.div({
  display: 'flex',
  justifyContent: 'space-between',
  marginTop: '2em',
});

const formName = 'sendNXS';
const valueSelector = formValueSelector(formName);
const mapStateToProps = state => {
  const {
    addressBook,
    myAccounts,
    myTritiumAccounts,
    settings: { minConfirmations },
    core: {
      info: { locked, minting_only },
    },
    form,
  } = state;
  const accountName = valueSelector(state, 'sendFrom');
  const recipients = valueSelector(state, 'recipients');
  const reference = valueSelector(state, 'reference');
  const expires = valueSelector(state, 'expires');
  const accBalance = getAccountBalance(accountName, myTritiumAccounts);
  const hideSendAll =
    recipients &&
    (recipients.length > 1 ||
      (recipients[0] && recipients[0].amount === accBalance));
  return {
    minConfirmations,
    locked,
    reference,
    expires,
    minting_only,
    accountName,
    accountOptions: getAccountOptions(myTritiumAccounts),
    addressNameMap: getAddressNameMap(addressBook),
    fieldNames: getRegisteredFieldNames(
      form[formName] && form[formName].registeredFields
    ),
    accBalance: hideSendAll ? undefined : accBalance,
  };
};

const mapDispatchToProps = {
  loadMyAccounts,
  openConfirmDialog,
  openErrorDialog,
  openSuccessDialog,
  removeModal,
  openModal,
};

/**
 * The Internal Send Form in the Send Page
 *
 * @class SendForm
 * @extends {Component}
 */
@connect(
  mapStateToProps,
  mapDispatchToProps
)
@reduxForm({
  form: formName,
  destroyOnUnmount: false,
  initialValues: {
    sendFrom: null,
    recipients: [
      {
        address: null,
        amount: '',
        fiatAmount: '',
      },
    ],
    reference: null,
    expires: null,
  },
  validate: ({ sendFrom, recipients, reference, expires }) => {
    const errors = {};
    if (!sendFrom) {
      errors.sendFrom = __('No accounts selected');
    }
    if (reference) {
      if (!reference.match('^[0-9]+$')) {
        errors.reference = __('Reference must be a number');
      } else {
        if (parseInt(reference) > 18446744073709551615) {
          errors.reference = __('Number is too large');
        }
      }
    }

    if (!recipients || !recipients.length) {
      errors.recipients = {
        _error: __('There must be at least one recipient'),
      };
    } else {
      const recipientsErrors = [];

      recipients.forEach(({ address, amount }, i) => {
        const recipientErrors = {};
        if (!address) {
          recipientErrors.address = __('Address is required');
        }
        const floatAmount = parseFloat(amount);
        if (!floatAmount || floatAmount < 0) {
          recipientErrors.amount = __('Invalid amount');
        }
        if (Object.keys(recipientErrors).length) {
          recipientsErrors[i] = recipientErrors;
        }
      });

      if (recipientsErrors.length) {
        errors.recipients = recipientsErrors;
      }
    }

    return errors;
  },
  asyncBlurFields: ['recipients[].address'],
  asyncValidate: async ({ recipients }) => {
    //Issue with backend
    return null;
    const recipientsErrors = [];
    await Promise.all(
      recipients.map(({ address }, i) =>
        rpc('validateaddress', [address])
          .then(result => {
            if (!result.isvalid) {
              recipientsErrors[i] = {
                address: __('Invalid address'),
              };
            } else if (result.ismine) {
              recipientsErrors[i] = {
                address: __('This is an address registered to this wallet.'),
              };
            }
          })
          .catch(err => {
            recipientsErrors[i] = {
              address: __('Invalid address'),
            };
          })
      )
    );
    if (recipientsErrors.length) {
      throw { recipients: recipientsErrors };
    }
    return null;
  },
  onSubmit: async (
    { sendFrom, recipients, reference, expires },
    dispatch,
    props
  ) => {
    const pin = await confirmPin();
    if (pin) {
      const params = {
        pin,
        name: sendFrom,
        address_to: recipients[0].address,
        amount: parseFloat(recipients[0].amount),
      };
      if (reference) params.reference = reference;
      if (expires) params.expires = expires;
      console.log(params);
      return await apiPost('finance/debit/account', params);
    }

    let minConfirmations = parseInt(props.minConfirmations);
    if (isNaN(minConfirmations)) {
      minConfirmations = defaultSettings.minConfirmations;
    }
  },
  onSubmitSuccess: (result, dispatch, props) => {
    if (!result) return;

    props.reset();
    props.loadMyAccounts();
    props.openSuccessDialog({
      message: __('Transaction sent'),
    });
  },
  onSubmitFail: errorHandler(__('Error sending NXS')),
})
class SendForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      optionalOpen: false,
    };
  }

  componentDidUpdate(prevProps) {
    // if you have EVER added to these items always show till form is reset.

    if (this.props.reference || this.props.expires) {
      if (
        this.props.reference !== prevProps.reference ||
        this.props.expires !== prevProps.expires
      ) {
        this.setState({
          optionalOpen: true,
        });
      }
    }
  }

  componentDidMount() {
    // if ref or experation was in the form then open the optionals.
    // form is NOT reset on component unmount so we must show it on mount
    if (this.props.reference || this.props.expires) {
      this.setState({
        optionalOpen: true,
      });
    }
  }

  /**
   * Confirm the Send
   *
   * @memberof SendForm
   */
  confirmSend = e => {
    e.preventDefault();
    const {
      handleSubmit,
      invalid,
      locked,
      minting_only,
      touch,
      fieldNames,
    } = this.props;

    if (invalid) {
      // Mark the form touched so that the validation errors will be shown.
      // redux-form doesn't have the `touchAll` feature yet so we have to list all fields manually.
      // redux-form also doesn't have the API to get all the field names yet so we have to connect to the store to retrieve it manually
      touch(...fieldNames);
      return;
    }
    handleSubmit();
  };

  OptionalButtonClick = e => {
    this.setState({
      optionalOpen: true,
    });
  };

  /**
   * Add Recipient to the queue
   *
   * @memberof SendForm
   */
  addRecipient = () => {
    this.props.array.push('recipients', {
      address: null,
      amount: '',
      fiatAmount: '',
    });
  };

  /**
   * Return JSX for the Add Recipient Button
   *
   * @memberof SendForm
   */
  renderAddRecipientButton = ({ fields }) =>
    //BEING REMOVED TILL NEW API SUPPORTS MULTI SEND
    fields.length === 1 ? (
      <Button onClick={this.addRecipient}>
        {__('Send To multiple recipients')}
      </Button>
    ) : (
      <div />
    );

  /**
   * Component's Renderable JSX
   *
   * @returns
   * @memberof SendForm
   */
  render() {
    const { accountOptions, change, accBalance } = this.props;
    return (
      <SendFormComponent onSubmit={this.confirmSend}>
        <FormField label={__('Send from')}>
          <Field
            component={Select.RF}
            name="sendFrom"
            placeholder={__('Select an account')}
            options={accountOptions}
          />
        </FormField>

        <FieldArray
          component={Recipients}
          name="recipients"
          change={change}
          addRecipient={this.addRecipient}
          accBalance={accBalance}
          sendFrom={{
            token: '0',
            name: this.props.accountName,
            tokenAddress: '0',
          }}
        />

        {this.state.optionalOpen ||
        this.props.reference ||
        this.props.expires ? (
          <>
            {' '}
            <FormField label={__('Reference')}>
              <Field
                component={TextField.RF}
                name="reference"
                normalize={numericOnly}
                placeholder={__('ulong (Optional)')}
              />
            </FormField>
            <FormField label={__('Expiration')}>
              <Field
                component={TextField.RF}
                name="expires"
                placeholder={__('Seconds till experation (Optional)')}
              />
            </FormField>{' '}
          </>
        ) : (
          <Button
            style={{ marginTop: '1em' }}
            onClick={this.OptionalButtonClick}
            skin="plain-inverted"
          >
            {__('Options')}
          </Button>
        )}

        <SendFormButtons>
          <Button type="submit" skin="primary" wide>
            <Icon icon={sendIcon} className="space-right" />
            {__('Send')}
          </Button>
        </SendFormButtons>
      </SendFormComponent>
    );
  }
}

export default SendForm;
