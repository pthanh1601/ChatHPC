import { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { ArrowLeft, Info, Pin, X, PlusCircle, Smile, Send, CheckCheck, Plus } from 'lucide-react-native';
import { AppScreen, CONTACTS, MEDIA } from '../data';
import { Header } from '../components/Header';

export function ChatGroup({ setScreen }: { setScreen: (s: AppScreen) => void }) {
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [blurIntensity, setBlurIntensity] = useState(0);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header blurIntensity={blurIntensity}>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => setScreen('chat_list')} className="mr-4">
            <ArrowLeft size={24} color="#0DBD8B" />
          </TouchableOpacity>
          <View className="flex-row -space-x-3 mr-4">
            <View className="h-10 w-10 rounded-full border-2 border-background overflow-hidden">
              <Image source={{ uri: CONTACTS.kael.avatar }} className="w-full h-full" />
            </View>
            <View className="h-10 w-10 rounded-full border-2 border-background overflow-hidden">
              <Image source={{ uri: CONTACTS.aria.avatar }} className="w-full h-full" />
            </View>
          </View>
          <View>
            <Text className="text-xl font-bold text-primary">Cyber Nexus</Text>
            <Text className="text-xs text-gray-400">12 participants online</Text>
          </View>
        </View>
        <TouchableOpacity>
          <Info size={24} color="#0DBD8B" />
        </TouchableOpacity>
      </Header>

      <ScrollView 
        className="flex-1 px-5 relative" 
        showsVerticalScrollIndicator={false}
        onScroll={(e) => setBlurIntensity(Math.min(100, Math.max(0, e.nativeEvent.contentOffset.y)))}
        scrollEventThrottle={16}
      >
        <View className="flex-col gap-6 pt-[120px] pb-24">
        {/* Shared Media Bar */}
        <View className="flex-col gap-2 -mx-5 px-5 z-40 bg-background/90 py-4 border-b border-white/5">
          <View className="flex-row justify-between items-center">
            <Text className="text-sm font-semibold text-white">Shared Media</Text>
            <Text className="text-xs font-medium text-primary">See All</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3 pb-1">
            {[MEDIA.landscape, MEDIA.circuit, MEDIA.workspace].map((src, i) => (
              <TouchableOpacity key={i} className="w-[80px] h-[80px] rounded-xl overflow-hidden border border-white/10 mr-3">
                <Image source={{ uri: src }} className="w-full h-full" />
              </TouchableOpacity>
            ))}
            <TouchableOpacity className="w-[80px] h-[80px] rounded-xl overflow-hidden border border-white/10 flex items-center justify-center bg-white/5">
              <PlusCircle size={24} color="#a0a0a0" />
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Pinned Message */}
        <View className="rounded-xl p-4 flex-row items-center bg-card relative overflow-hidden my-4 border border-primary/50">
          <View className="mr-3"><Pin size={20} color="#0DBD8B" /></View>
          <View className="flex-1">
            <Text className="text-xs font-semibold text-primary">Pinned Message</Text>
            <Text className="text-sm text-white" numberOfLines={1}>Meeting tomorrow at 10 AM. Don't forget the prototypes!</Text>
          </View>
          <TouchableOpacity>
            <X size={16} color="#a0a0a0" />
          </TouchableOpacity>
        </View>

        {/* Chat History */}
        <View className="flex-col gap-6">
          {/* Recipient Message (Me) */}
          <View className="flex-col items-end gap-1">
            <Text className="text-xs text-gray-500 px-2">You</Text>
            <View className="bg-bubble p-4 rounded-2xl rounded-tr-none max-w-[85%]">
              <Text className="text-base text-white">Did everyone see the latest design system updates? The new glassmorphism tokens are ready for testing.</Text>
              <View className="flex-row justify-end items-center gap-1 mt-1">
                <Text className="text-[10px] text-white/70">10:42 AM</Text>
                <CheckCheck size={14} color="#0DBD8B" />
              </View>
            </View>
          </View>

          {/* Sender Message */}
          <View className="flex-col items-start gap-1">
            <Text className="text-xs text-gray-500 px-2">Aria Thorne</Text>
            <View className="bg-card border border-white/5 p-4 rounded-2xl rounded-tl-none max-w-[85%]">
              <Text className="text-base text-white">Just checked them out! The backdrop-blur levels on the floating nav look incredible. Should we apply the same to the modal overlays?</Text>
              <View className="flex-row items-center gap-1 mt-1">
                <Text className="text-[10px] text-gray-500">10:44 AM</Text>
              </View>
            </View>
          </View>

          {/* Sender Message with Image */}
          <View className="flex-col items-start gap-1">
            <Text className="text-xs text-gray-500 px-2">Marcus Vane</Text>
            <View className="bg-card border border-white/5 p-2 rounded-2xl rounded-tl-none max-w-[85%] flex-col gap-3">
              <Image source={{ uri: MEDIA.dashboard }} className="rounded-xl w-full h-40" />
              <Text className="text-base px-2 text-white">Here is the preview of the neon accent states I was talking about. It really pops against the deep navy background.</Text>
              <View className="flex-row items-center gap-1 mt-1 px-2 mb-1">
                <Text className="text-[10px] text-gray-500">10:45 AM</Text>
              </View>
            </View>
          </View>

          {/* Recipient Message (Me) */}
          <View className="flex-col items-end gap-1 mb-10">
            <Text className="text-xs text-gray-500 px-2">You</Text>
            <View className="bg-bubble p-4 rounded-2xl rounded-tr-none max-w-[85%]">
              <Text className="text-base text-white">Looks sharp, Marcus. Let's go with that for the interactive components.</Text>
              <View className="flex-row justify-end items-center gap-1 mt-1">
                <Text className="text-[10px] text-white/70">10:46 AM</Text>
                <CheckCheck size={14} color="#03B381" />
              </View>
            </View>
          </View>
        </View>
        </View>
      </ScrollView>

      <View className={`w-full z-40 px-5 pt-2 bg-transparent ${isKeyboardVisible ? 'pb-6' : 'pb-[96px]'}`}>
        <View className="bg-card rounded-full p-1.5 flex-row items-center border border-white/10">
          <TouchableOpacity className="w-12 h-12 flex items-center justify-center">
            <Plus size={28} color="#0DBD8B" />
          </TouchableOpacity>
          <View className="flex-1 h-12 bg-background/50 rounded-full justify-center px-4 mx-1">
            <TextInput 
              placeholder="Type a message..." 
              placeholderTextColor="#a0a0a0" 
              multiline={true}
              blurOnSubmit={false}
              className="w-full text-base text-white p-0"
              style={{ 
                includeFontPadding: false, 
                textAlignVertical: 'center',
                paddingVertical: 0,
                marginTop: -4
              }}
            />
          </View>
          <TouchableOpacity className="w-12 h-12 flex items-center justify-center mr-1">
            <Smile size={24} color="#03B381" />
          </TouchableOpacity>
          <TouchableOpacity className="w-12 h-12 flex items-center justify-center rounded-full bg-bubble">
            <Send size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
