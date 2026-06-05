/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState } from 'react';
import { AppScreen } from './data';
import { BottomNav } from './components/BottomNav';
import { ChatList } from './components/screens/ChatList';
import { ChatSingle } from './components/screens/ChatSingle';
import { ChatGroup } from './components/screens/ChatGroup';
import { Profile } from './components/screens/Profile';
import { SafeScreen } from './components/SafeScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('chat_list');

  return (
    <SafeScreen>
      {currentScreen === 'chat_list' && <ChatList setScreen={setCurrentScreen} />}
      {currentScreen === 'chat_single' && <ChatSingle setScreen={setCurrentScreen} />}
      {currentScreen === 'chat_group' && <ChatGroup setScreen={setCurrentScreen} />}
      {currentScreen === 'profile' && <Profile setScreen={setCurrentScreen} />}
      
      {/* Bottom Nav is persistent across all screens except maybe single/group chat depending on design, 
          but images show it on all screens. In group chat it might be slightly hidden by input, 
          let's follow the screens literally. */}
      {currentScreen !== 'chat_single' && <BottomNav currentScreen={currentScreen} setScreen={setCurrentScreen} />}
    </SafeScreen>
  );
}
