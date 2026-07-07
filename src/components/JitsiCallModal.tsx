import React from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';
import { X } from 'lucide-react-native';
import { getMatrixClient } from '../services/MatrixService';

interface JitsiCallModalProps {
    visible: boolean;
    roomName: string;
    onClose: () => void;
    serverURL?: string;
}

export function JitsiCallModal({ visible, roomName, onClose, serverURL = 'https://jitsi.5hpc.com' }: JitsiCallModalProps) {
    if (!visible) return null;

    // Clean up room name to be a valid Jitsi room (alphanumeric)
    const cleanRoomName = roomName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const finalRoomName = cleanRoomName.length > 0 ? cleanRoomName : 'ChatHPCRoom';

    const client = getMatrixClient();
    const userId = client?.getUserId() || '';
    const user = client ? client.getUser(userId) : null;
    const displayName = user?.displayName || 'ChatHPC User';

    // Construct Jitsi Web URL with config parameters embedded
    // config.prejoinPageEnabled=false skips the prejoin screen
    const jitsiUrl = `${serverURL}/${finalRoomName}#config.prejoinPageEnabled=false&userInfo.displayName="${encodeURIComponent(displayName)}"`;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <SafeAreaView style={{ flex: 1, backgroundColor: '#1e1e1e' }}>
                    <WebView
                        source={{ uri: jitsiUrl }}
                        style={{ flex: 1, backgroundColor: '#1e1e1e' }}
                        allowsInlineMediaPlayback={true}
                        mediaPlaybackRequiresUserAction={false}
                        mediaCapturePermissionGrantType="grant"
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                    />
                </SafeAreaView>
                
                {/* Fallback close button */}
                <TouchableOpacity 
                    style={styles.closeButton} 
                    onPress={onClose}
                >
                    <X color="white" size={24} />
                </TouchableOpacity>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1e1e1e',
    },
    closeButton: {
        position: 'absolute',
        top: 60,
        left: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    }
});
