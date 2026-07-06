const fs = require('fs');
const file = '/Users/pthanh/Downloads/ChatHPC/src/screens/InviteMembers.tsx';
let code = fs.readFileSync(file, 'utf8');

// Replace imports
code = code.replace(/import \{ Search, X, Plus, ChevronDown, Users \} from 'lucide-react-native';/, "import { Search, X, Check, ChevronDown, CheckCircle, Circle } from 'lucide-react-native';");

// Add selectedUsers state
code = code.replace(/const \[popupMessage, setPopupMessage\] = useState\(\'\'\);/, "const [popupMessage, setPopupMessage] = useState('');\n  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);");

// Replace handleAddUser
code = code.replace(/const handleAddUser = async \(userId: string\) => \{[\s\S]*?\}\;/m, `const handleInviteSelected = async () => {
    Keyboard.dismiss();
    if (selectedUsers.length === 0) return;
    setIsLoading(true);
    try {
      const client = getMatrixClient();
      if (!client) throw new Error("Chưa kết nối đến Matrix Server");

      const roomId = currentActiveRoomId;
      if (roomId) {
        // Mời vào phòng hiện tại
        for (const userId of selectedUsers) {
          await client.invite(roomId, userId);
        }
        setPopupMessage(\`Đã gửi lời mời đến \${selectedUsers.length} người dùng\`);
        setSuccessVisible(true);
        setTimeout(() => setScreen('chat_single'), 1500);
      } else {
        // Tạo phòng chat nhóm mới
        const res = await client.createRoom({
          invite: selectedUsers,
          preset: 'trusted_private_chat'
        });
        setCurrentActiveRoomId(res.room_id);
        setPopupMessage('Đã tạo cuộc trò chuyện!');
        setSuccessVisible(true);
        setTimeout(() => setScreen('chat_single'), 1500);
      }
    } catch (err: any) {
      setPopupMessage(err.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
      setErrorVisible(true);
    } finally {
      setIsLoading(false);
    }
  };
  
  const toggleSelectUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };`);

// Replace Header Actions
code = code.replace(/<TouchableOpacity onPress=\{\(\) => setScreen\(currentActiveRoomId \? \'chat_single\' \: \'chat_list\'\)\}>\n\s*<Text className=\"text-\[\#0DBD8B\] text-\[17px\]\">Hủy<\/Text>\n\s*<\/TouchableOpacity>/, `{selectedUsers.length > 0 ? (
            <TouchableOpacity onPress={handleInviteSelected} disabled={isLoading}>
              <Text className="text-[#0DBD8B] text-[17px] font-bold">Mời ({selectedUsers.length})</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setScreen(currentActiveRoomId ? 'chat_single' : 'chat_list')}>
              <Text className="text-[#0DBD8B] text-[17px]">Hủy</Text>
            </TouchableOpacity>
          )}`);

// Replace User list item button
code = code.replace(/<TouchableOpacity onPress=\{\(\) => handleAddUser\(user\.user_id\)\} disabled=\{isLoading\} className=\"p-2\">\n\s*<Plus size=\{24\} color=\"#ffffff\" \/>\n\s*<\/TouchableOpacity>/g, `<TouchableOpacity onPress={() => toggleSelectUser(user.user_id)} className="p-2">
                      {selectedUsers.includes(user.user_id) ? (
                        <CheckCircle size={24} color="#0DBD8B" />
                      ) : (
                        <Circle size={24} color="#8e8e93" />
                      )}
                    </TouchableOpacity>`);

fs.writeFileSync(file, code);
