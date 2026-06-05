import { View, Text, TouchableOpacity } from 'react-native';
import { MessageCircle, Users, Compass, Menu } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { AppScreen } from '../data';

interface BottomNavProps {
  currentScreen: AppScreen;
  setScreen: (screen: AppScreen) => void;
}

export function BottomNav({ currentScreen, setScreen }: BottomNavProps) {
  return (
    <View className="absolute bottom-6 left-5 right-5 z-50 shadow-lg shadow-[#8a2be2]/20">
      <BlurView intensity={40} tint="dark" className="flex-row justify-between items-center px-2 py-3 bg-surface/40 border border-white/10 rounded-full overflow-hidden">
        <TouchableOpacity 
          onPress={() => setScreen('chat_list')}
          className={`flex-1 flex-col items-center justify-center ${currentScreen === 'chat_list' ? '' : 'opacity-70'}`}
        >
          <MessageCircle size={24} color={currentScreen === 'chat_list' ? '#dcb8ff' : '#a0a0a0'} />
          <Text className={`text-[10px] mt-1 font-medium ${currentScreen === 'chat_list' ? 'text-primary' : 'text-muted'}`}>Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => setScreen('chat_group')}
          className={`flex-1 flex-col items-center justify-center ${currentScreen === 'chat_group' ? '' : 'opacity-70'}`}
        >
          <Users size={24} color={currentScreen === 'chat_group' ? '#dcb8ff' : '#a0a0a0'} />
          <Text className={`text-[10px] mt-1 font-medium ${currentScreen === 'chat_group' ? 'text-primary' : 'text-muted'}`}>Groups</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => setScreen('chat_single')}
          className={`flex-1 flex-col items-center justify-center ${currentScreen === 'chat_single' ? '' : 'opacity-70'}`}
        >
          <Compass size={24} color={currentScreen === 'chat_single' ? '#dcb8ff' : '#a0a0a0'} />
          <Text className={`text-[10px] mt-1 font-medium ${currentScreen === 'chat_single' ? 'text-primary' : 'text-muted'}`}>Explore</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => setScreen('profile')}
          className={`flex-1 flex-col items-center justify-center ${currentScreen === 'profile' ? '' : 'opacity-70'}`}
        >
          <Menu size={24} color={currentScreen === 'profile' ? '#dcb8ff' : '#a0a0a0'} />
          <Text className={`text-[10px] mt-1 font-medium ${currentScreen === 'profile' ? 'text-primary' : 'text-muted'}`}>Menu</Text>
        </TouchableOpacity>
      </BlurView>
    </View>
  );
}
