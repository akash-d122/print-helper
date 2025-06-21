import React from 'react';
import { Provider } from 'react-redux';
import { render } from '@testing-library/react-native';
import configureStore from 'redux-mock-store';
import { NavigationContainer } from '@react-navigation/native';

export function renderWithProvider(ui, { initialState, store = configureStore([])(initialState) } = {}) {
  return render(
    <Provider store={store}>
      <NavigationContainer>{ui}</NavigationContainer>
    </Provider>
  );
}

export const mockStore = configureStore([]); 