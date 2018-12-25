// External
import React, { Component } from 'react';
import styled from '@emotion/styled';

// Internal
import { newUID } from 'utils';
import { colors } from 'styles';

const FieldWrapper = styled.div(
  {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '1em 0',
    borderBottom: `1px solid ${colors.darkerGray}`,
  },
  ({ center }) =>
    center && {
      alignItems: 'center',
    }
);

const Label = styled.label({
  position: 'relative',
  paddingRight: '3em',
  width: 400,
});

const SubLabel = styled.div({
  color: colors.lightGray,
  fontSize: '.9em',
});

const Input = styled.div({
  flexGrow: 1,
});

class SettingsField extends Component {
  inputId = newUID();

  render() {
    const { label, subLabel, connectLabel, children, ...rest } = this.props;
    return (
      <FieldWrapper center={!subLabel} {...rest}>
        <Label htmlFor={connectLabel ? this.inputId : undefined}>
          <div>{label}</div>
          {subLabel && <SubLabel>{subLabel}</SubLabel>}
        </Label>
        <Input>
          {connectLabel
            ? React.cloneElement(React.Children.only(children), {
                id: this.inputId,
              })
            : children}
        </Input>
      </FieldWrapper>
    );
  }
}

export default SettingsField;
