import { useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Platform, TextInput, LayoutAnimation, UIManager } from 'react-native';
import { Search as SearchIcon, X, Clock, UserPlus } from 'lucide-react-native';
import { AppScreen, CONTACTS } from '../data';
import { Header } from '../components/Header';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function Search({ setScreen }: { setScreen: (s: AppScreen) => void }) {
  const [blurIntensity, setBlurIntensity] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  const toggleSearch = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsSearchExpanded(!isSearchExpanded);
    if (isSearchExpanded) {
      setSearchQuery('');
    }
  };

  return (
    <View className="flex-1 bg-background">
      <Header blurIntensity={blurIntensity}>
        {!isSearchExpanded && (
          <Text className="text-2xl font-bold text-primary mr-4">Tìm kiếm</Text>
        )}
        <View className={`flex-row items-center justify-end ${isSearchExpanded ? 'flex-1' : ''}`}>
          {isSearchExpanded ? (
            <View className="flex-1 flex-row items-center gap-3 bg-card rounded-2xl p-2 border border-white/10">
              <SearchIcon size={20} color="#a0a0a0" className="ml-2" />
              <TextInput 
                placeholder="Tìm kiếm đồng nghiệp, nhóm..." 
                placeholderTextColor="#a0a0a0"
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="flex-1 text-base text-white p-0 h-8"
                autoFocus
              />
              <TouchableOpacity onPress={toggleSearch} className="p-1">
                <X size={18} color="#a0a0a0" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={toggleSearch}>
              <SearchIcon size={24} color="#dcb8ff" />
            </TouchableOpacity>
          )}
        </View>
      </Header>

      <ScrollView 
        className="flex-1 px-5" 
        contentContainerStyle={{ paddingTop: 100, paddingBottom: 120 }}
        onScroll={(e) => setBlurIntensity(Math.min(100, Math.max(0, e.nativeEvent.contentOffset.y)))}
        scrollEventThrottle={16}
      >
        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Tìm kiếm gần đây</Text>
        
        <View className="gap-4 mb-8">
          <TouchableOpacity className="flex-row items-center gap-3">
            <View className="w-10 h-10 bg-surface rounded-full flex items-center justify-center border border-white/5">
              <Clock size={16} color="#a0a0a0" />
            </View>
            <Text className="text-base text-white flex-1">Nhóm Cyber Nexus</Text>
            <TouchableOpacity>
              <X size={16} color="#a0a0a0" />
            </TouchableOpacity>
          </TouchableOpacity>
          
          <TouchableOpacity className="flex-row items-center gap-3">
            <View className="w-10 h-10 bg-surface rounded-full flex items-center justify-center border border-white/5">
              <Clock size={16} color="#a0a0a0" />
            </View>
            <Text className="text-base text-white flex-1">Nova</Text>
            <TouchableOpacity>
              <X size={16} color="#a0a0a0" />
            </TouchableOpacity>
          </TouchableOpacity>
        </View>

        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Gợi ý liên hệ</Text>
        
        <View className="gap-4">
          {[CONTACTS.luna, CONTACTS.nova].map((contact, i) => (
            <TouchableOpacity key={i} className="bg-card rounded-2xl p-4 flex-row items-center gap-3 border border-white/5" onPress={() => setScreen('chat_single')}>
              <View className="w-12 h-12 rounded-full overflow-hidden border border-white/10">
                <Image source={{ uri: contact.avatar }} className="w-full h-full" />
              </View>
              <View className="flex-1 justify-center ml-1">
                <Text className="font-bold text-[15px] text-white">{contact.name}</Text>
                <Text className="text-sm text-gray-400 mt-0.5">Đồng nghiệp</Text>
              </View>
              <TouchableOpacity className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center border border-primary/30">
                <UserPlus size={18} color="#dcb8ff" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
