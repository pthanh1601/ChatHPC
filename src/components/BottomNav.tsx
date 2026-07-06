import { View, Text, TouchableOpacity, LayoutAnimation, Platform, UIManager, DeviceEventEmitter } from 'react-native';
import { MessageCircle, Phone, Settings, Users } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { AppScreen } from '../data';
import theme from '../theme';

interface BottomNavProps {
  currentScreen: AppScreen;
  setScreen: (screen: AppScreen) => void;
}

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function BottomNav({ currentScreen, setScreen }: BottomNavProps) {
  const handleNavigation = (screen: AppScreen) => {
    if (currentScreen !== screen) {
      // Thêm animation chuyển đổi màn hình mượt mà giữa các tab
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setScreen(screen);
    }
  };

  return (
    <View className="absolute bottom-6 left-5 right-5 z-50 flex-row items-center justify-between shadow-lg shadow-primary/20">
      
      {/* Viên nén (Pill) chứa các tab */}
      <BlurView intensity={40} tint="dark" className="flex-1 flex-row justify-between items-center px-4 py-3 bg-surface/40 border border-white/10 rounded-full overflow-hidden">
        
        <TouchableOpacity 
          onPress={() => handleNavigation('chat_list')}
          className={`flex-1 flex-col items-center justify-center ${currentScreen === 'chat_list' ? '' : 'opacity-70'}`}
        >
          <MessageCircle size={24} color={currentScreen === 'chat_list' ? theme.colors.primary : theme.colors.muted} />
          <Text className={`text-[10px] mt-1 font-medium ${currentScreen === 'chat_list' ? 'text-primary' : 'text-muted'}`}>Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => handleNavigation('calls')}
          className={`flex-1 flex-col items-center justify-center ${currentScreen === 'calls' ? '' : 'opacity-70'}`}
        >
          <Phone size={24} color={currentScreen === 'calls' ? theme.colors.primary : theme.colors.muted} />
          <Text className={`text-[10px] mt-1 font-medium ${currentScreen === 'calls' ? 'text-primary' : 'text-muted'}`}>Cuộc gọi</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => handleNavigation('contacts')}
          className={`flex-1 flex-col items-center justify-center ${currentScreen === 'contacts' ? '' : 'opacity-70'}`}
        >
          <View>
            <Users size={24} color={currentScreen === 'contacts' ? theme.colors.primary : theme.colors.muted} />
          </View>
          <Text className={`text-[10px] mt-1 font-medium ${currentScreen === 'contacts' ? 'text-primary' : 'text-muted'}`}>Danh bạ</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => handleNavigation('profile')}
          className={`flex-1 flex-col items-center justify-center ${currentScreen === 'profile' ? '' : 'opacity-70'}`}
        >
          <Settings size={24} color={currentScreen === 'profile' ? theme.colors.primary : theme.colors.muted} />
          <Text className={`text-[10px] mt-1 font-medium ${currentScreen === 'profile' ? 'text-primary' : 'text-muted'}`}>Cài đặt</Text>
        </TouchableOpacity>

      </BlurView>
    </View>
  );
}
