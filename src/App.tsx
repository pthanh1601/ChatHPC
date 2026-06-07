/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useEffect } from 'react';
import { AppScreen } from './data';
import { loginToMatrix, startMatrixSync } from './screens/matrix';
import { BottomNav } from './components/BottomNav';
import { Login } from './screens/Login';
import { ChatList } from './screens/ChatList';
import { ChatSingle } from './screens/ChatSingle';
import { ChatGroup } from './screens/ChatGroup';
import { Profile } from './screens/Profile';
import { Calls } from './screens/Calls';
import { Search } from './screens/Search';
import { SafeScreen } from './components/SafeScreen';
import { CreateRoom } from './screens/CreateRoom';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('login');

  return (
    <SafeScreen>
      {currentScreen === 'login' && <Login setScreen={setCurrentScreen} />}
      {currentScreen === 'chat_list' && <ChatList setScreen={setCurrentScreen} />}
      {currentScreen === 'chat_single' && <ChatSingle setScreen={setCurrentScreen} />}
      {currentScreen === 'chat_group' && <ChatGroup setScreen={setCurrentScreen} />}
      {currentScreen === 'profile' && <Profile setScreen={setCurrentScreen} />}
      {currentScreen === 'calls' && <Calls setScreen={setCurrentScreen} />}
      {currentScreen === 'search' && <Search setScreen={setCurrentScreen} />}
      {currentScreen === 'create_room' && <CreateRoom setScreen={setCurrentScreen} />}
      
      {/* Bottom Nav is persistent across all screens except maybe single/group chat depending on design, 
          but images show it on all screens. In group chat it might be slightly hidden by input, 
          let's follow the screens literally. */}
      {currentScreen !== 'chat_single' && currentScreen !== 'login' && currentScreen !== 'create_room' && <BottomNav currentScreen={currentScreen} setScreen={setCurrentScreen} />}
    </SafeScreen>
  );
}
