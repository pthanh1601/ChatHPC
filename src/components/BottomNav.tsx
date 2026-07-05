import { View, Text, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { MessageCircle, Phone, Menu, Users, Search } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { AppScreen } from '../data';

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
      <BlurView intensity={40} tint="dark" className="flex-1 mr-3 flex-row justify-between items-center px-2 py-3 bg-surface/40 border border-white/10 rounded-full overflow-hidden">
        
        <TouchableOpacity 
          onPress={() => {}} // Có thể gắn link sau nếu có trang Danh bạ
          className="flex-1 flex-col items-center justify-center opacity-70"
        >
          <View>
            <Users size={24} color="#a0a0a0" />
            <View className="absolute -top-1 -right-1 bg-red-500 rounded-full w-3.5 h-3.5 items-center justify-center border border-background">
              <Text className="text-white text-[8px] font-bold">1</Text>
            </View>
          </View>
          <Text className="text-[10px] mt-1 font-medium text-muted">Danh bạ</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => handleNavigation('calls')}
          className={`flex-1 flex-col items-center justify-center ${currentScreen === 'calls' ? '' : 'opacity-70'}`}
        >
          <Phone size={24} color={currentScreen === 'calls' ? '#0DBD8B' : '#a0a0a0'} />
          <Text className={`text-[10px] mt-1 font-medium ${currentScreen === 'calls' ? 'text-primary' : 'text-muted'}`}>Cuộc gọi</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => handleNavigation('chat_list')}
          className={`flex-1 flex-col items-center justify-center ${currentScreen === 'chat_list' ? '' : 'opacity-70'}`}
        >
          <MessageCircle size={24} color={currentScreen === 'chat_list' ? '#0DBD8B' : '#a0a0a0'} />
          <Text className={`text-[10px] mt-1 font-medium ${currentScreen === 'chat_list' ? 'text-primary' : 'text-muted'}`}>Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => handleNavigation('profile')}
          className={`flex-1 flex-col items-center justify-center ${currentScreen === 'profile' ? '' : 'opacity-70'}`}
        >
          <Menu size={24} color={currentScreen === 'profile' ? '#0DBD8B' : '#a0a0a0'} />
          <Text className={`text-[10px] mt-1 font-medium ${currentScreen === 'profile' ? 'text-primary' : 'text-muted'}`}>Menu</Text>
        </TouchableOpacity>

      </BlurView>

      {/* Nút tròn (Circle) chứa Tìm kiếm */}
      <TouchableOpacity onPress={() => handleNavigation('search')} className="shadow-lg shadow-primary/20">
        <BlurView intensity={40} tint="dark" className="w-[56px] h-[56px] items-center justify-center bg-surface/40 border border-white/10 rounded-full overflow-hidden">
          <Search size={24} color={currentScreen === 'search' ? '#0DBD8B' : '#ffffff'} />
        </BlurView>
      </TouchableOpacity>

    </View>
  );
}
