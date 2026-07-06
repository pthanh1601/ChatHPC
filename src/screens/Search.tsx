import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, Platform, TextInput, FlatList, KeyboardAvoidingView, ScrollView, SafeAreaView, StatusBar } from 'react-native';
import { Search as SearchIcon, X } from 'lucide-react-native';
import { AppScreen } from '../data';
import { getMatrixClient } from '../services/MatrixService';
import { getInitialChats, MemoizedChatItem } from './ChatList';
import theme from '../theme';

const SEARCH_TABS = ['Chats', 'Channels', 'Apps', 'Posts', 'Media', 'Links'];

export function Search({ setScreen }: { setScreen: (s: AppScreen) => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Chats');
  const [allChats, setAllChats] = useState<any[]>([]);

  useEffect(() => {
    // Fetch all chats once when Search screen is mounted
    setAllChats(getInitialChats());
  }, []);

  const filteredChats = useMemo(() => {
    if (searchQuery.trim().length === 0) return [];
    
    const searchLower = searchQuery.toLowerCase();
    
    return allChats.filter(c => {
      if (c.isInvite) return false;

      let matchesSearch = c.name?.toLowerCase().includes(searchLower) || c.lastMessage?.toLowerCase().includes(searchLower);

      if (matchesSearch) {
        c.matchedEventId = c.lastEventId;
        c.searchQuery = searchQuery;
      }

      // Search deep into the timeline
      if (!matchesSearch) {
        const client = getMatrixClient();
        const room = client?.getRoom(c.id);
        if (room) {
          const events = room.timeline;
          for (let i = events.length - 1; i >= 0; i--) {
            const event = events[i];
            if (event.getType() === 'm.room.message') {
              let body = event.getContent().body;
              if (event.isEncrypted && event.isEncrypted()) {
                const clear = event.getClearContent();
                if (clear && clear.body) body = clear.body;
              }
              if (body && body.toLowerCase().includes(searchLower)) {
                matchesSearch = true;
                c.matchedEventId = event.getId();
                c.searchQuery = searchQuery;
                break;
              }
            }
          }
        }
      }

      return matchesSearch;
    });
  }, [allChats, searchQuery]);

  return (
    <SafeAreaView className="flex-1 bg-background" style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-background"
      >
      <View className="flex-1 pt-4 px-2">
        {searchQuery.trim().length > 0 ? (
          <FlatList
            data={filteredChats}
            keyExtractor={item => item.id}
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 20 }}
            keyboardShouldPersistTaps="always"
            renderItem={({ item: chat }) => (
              <MemoizedChatItem
                chat={chat}
                setScreen={setScreen}
                handleAcceptInvite={() => {}}
                handleRejectInvite={() => {}}
              />
            )}
            ListEmptyComponent={() => (
              <Text className="text-muted text-center mt-8 text-base">No results found</Text>
            )}
          />
        ) : (
          <View className="flex-1" />
        )}
      </View>

      <View className="pb-4 px-3">
        {/* Tabs Row */}
        <View className="flex-row items-center mb-3">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            {SEARCH_TABS.map(tab => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-full mr-1 ${activeTab === tab ? 'bg-surface' : ''}`}
              >
                <Text className={`text-[15px] font-medium ${activeTab === tab ? 'text-white' : 'text-muted'}`}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Search Input Row */}
        <View className="flex-row items-center">
          <View className="flex-1 bg-surface rounded-full flex-row items-center px-4 h-11">
            <SearchIcon size={20} color={theme.colors.muted} />
            <TextInput 
              placeholder="Search" 
              placeholderTextColor={theme.colors.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 text-white text-[17px] ml-2 h-full"
              style={{ paddingVertical: 0 }}
              autoFocus
            />
          </View>
          <TouchableOpacity 
            onPress={() => {
              if (searchQuery.length > 0) {
                setSearchQuery('');
              } else {
                setScreen('chat_list');
              }
            }} 
            className="w-11 h-11 bg-surface rounded-full ml-3 items-center justify-center"
          >
            <X size={22} color={theme.colors.muted} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

