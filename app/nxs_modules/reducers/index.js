import { combineReducers } from 'redux';
import { connectRouter } from 'connected-react-router';
import { reducer as formReducer } from 'redux-form';

import overview from './overview';
import list from './list';
import market from './market';
import transactions from './transactions';
import common from './common';
import login from './login';
import exchange from './exchange';
import sendReceive from './sendReceive';
import addressBook from './addressBook';
import myAccounts from './myAccounts';
import settings from './settings';
import theme from './theme';
import ui from './ui';

import { addLocaleData } from 'react-intl';
import ru from 'react-intl/locale-data/ru';
import ja from 'react-intl/locale-data/ja';
import de from 'react-intl/locale-data/de';
import en from 'react-intl/locale-data/en';
import ko from 'react-intl/locale-data/ko';
import fr from 'react-intl/locale-data/fr';
import es from 'react-intl/locale-data/es';

addLocaleData(ru);
addLocaleData(en);
addLocaleData(ja);
addLocaleData(de);
addLocaleData(ko);
addLocaleData(fr);
addLocaleData(es);

export default function createRootReducer(history) {
  const routerReducer = connectRouter(history);

  return connectRouter(history)(
    combineReducers({
      overview,
      router: routerReducer,
      list,
      login,
      market,
      sendReceive,
      transactions,
      exchange,
      common,
      addressBook,
      myAccounts,
      settings,
      theme,
      ui,
      form: formReducer,
    })
  );
}
