import { EventEmitter } from 'events';
import { matrixService, getMatrixClient } from './MatrixService';

class VoipService extends EventEmitter {
    public activeCall: any = null;
    private _initialized: boolean = false;

    async placeCall(roomId: string, type: 'voice' | 'video' = 'voice') {
        const client = getMatrixClient();
        if (!client) return;
        const call = client.createCall(roomId);
        if (!call) return;
        this.handleNewCall(call, false, type);
    }

    handleNewCall(call: any, isIncoming: boolean, type: 'voice' | 'video' = 'voice') {
        this.activeCall = call;

        const updateUI = () => {
            if (!this.activeCall) {
                this.emit('call.update', null);
                return;
            }
            const data = {
                id: call.callId,
                roomId: call.roomId,
                type: call.type || type,
                state: call.state,
                isIncoming: isIncoming && call.state === 'ringing',
                localStream: call.localUsermediaStream || call.localStream,
                remoteStream: call.remoteUsermediaStream || call.remoteStream,
                startTime: call.startTime,
            };
            this.emit('call.update', data);
        };

        call.on('state', (state: string) => {
            if (state === 'connected' && !call.startTime) call.startTime = Date.now();
            if (state === 'ended') this.activeCall = null;
            updateUI();
        });

        call.on('local_stream', (stream: any) => { this.emit('call.local_stream', stream); updateUI(); });
        call.on('remote_stream', (stream: any) => { this.emit('call.remote_stream', stream); updateUI(); });

        call.on('error', (err: any) => {
            console.error("Lỗi WebRTC/Call:", err);
            this.hangupCall();
        });

        if (!isIncoming) {
            if (type === 'video') call.placeVideoCall();
            else call.placeVoiceCall();
        }
        updateUI();
    }

    answerCall() {
        if (this.activeCall && this.activeCall.state === 'ringing') this.activeCall.answer();
    }

    hangupCall() {
        if (this.activeCall) {
            this.activeCall.hangup();
            this.activeCall = null;
            this.emit('call.update', null);
        }
    }

    init(client: any) {
        if (this._initialized) return;
        this._initialized = true;

        client.on('toDeviceEvent', (event: any) => {
            if (event.getType() === 'xyz.chathpc.call_upgrade') {
                const content = event.getContent();
                if (!this.activeCall || this.activeCall.callId !== content.call_id) return;
                
                if (content.action === 'request_video_upgrade') {
                    this.emit('call.video_upgrade_requested', content);
                } else if (content.action === 'accept_video_upgrade') {
                    this.performVideoUpgrade();
                } else if (content.action === 'reject_video_upgrade') {
                    this.emit('call.video_upgrade_rejected', content);
                }
            }
        });
    }

    private _sendSignaling(action: string) {
        if (!this.activeCall) return;
        const client = getMatrixClient();
        if (!client) return;
        const room = client.getRoom(this.activeCall.roomId);
        if (!room) return;

        const otherMembers = room.getJoinedMembers().filter((m: any) => m.userId !== client.getUserId());
        if (otherMembers.length === 0) return;

        const content = {
            call_id: this.activeCall.callId,
            action: action
        };

        const contentMap: Record<string, any> = {};
        for (const member of otherMembers) {
            contentMap[member.userId] = { '*': content };
        }

        client.sendToDevice('xyz.chathpc.call_upgrade', contentMap);
    }

    requestVideoUpgrade() {
        this._sendSignaling('request_video_upgrade');
    }

    acceptVideoUpgrade() {
        this._sendSignaling('accept_video_upgrade');
        this.performVideoUpgrade();
    }

    rejectVideoUpgrade() {
        this._sendSignaling('reject_video_upgrade');
    }

    async performVideoUpgrade() {
        if (!this.activeCall) return;
        
        try {
            if (typeof this.activeCall.upgradeCall === 'function') {
                await this.activeCall.upgradeCall(true, true);
            }
            
            // Cập nhật lại UI state thành video
            this.activeCall.type = 'video';
            const data = {
                id: this.activeCall.callId,
                roomId: this.activeCall.roomId,
                type: 'video',
                state: this.activeCall.state,
                isIncoming: false,
                localStream: this.activeCall.localUsermediaStream || this.activeCall.localStream,
                remoteStream: this.activeCall.remoteUsermediaStream || this.activeCall.remoteStream,
                startTime: this.activeCall.startTime,
            };
            this.emit('call.update', data);
        } catch (err) {
            console.error("Lỗi khi nâng cấp cuộc gọi Video:", err);
        }
    }
}

export const voipService = new VoipService();
