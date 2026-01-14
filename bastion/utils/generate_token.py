#!/usr/bin/env python3
"""
Guacamole Token Generator
Generate encrypted connection tokens for guacamole-lite bastion server
"""

import json
import base64
import argparse
from urllib.parse import quote
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import padding
import os

class TokenGenerator:
    def __init__(self, secret_key: str):
        """
        Initialize token generator with secret key.

        Args:
            secret_key: 32-character secret key (must match server config)
        """
        if len(secret_key) != 32:
            raise ValueError("Secret key must be exactly 32 characters")
        self.secret_key = secret_key.encode('utf-8')

    def encrypt_token(self, connection_config: dict) -> str:
        """
        Encrypt connection configuration into a token.

        Args:
            connection_config: Dictionary containing connection parameters

        Returns:
            Base64-encoded encrypted token string
        """
        # Convert config to JSON
        plaintext = json.dumps(connection_config)

        # Generate random IV
        iv = os.urandom(16)

        # Create cipher
        cipher = Cipher(
            algorithms.AES(self.secret_key),
            modes.CBC(iv),
            backend=default_backend()
        )
        encryptor = cipher.encryptor()

        # Pad plaintext
        padder = padding.PKCS7(128).padder()
        padded_data = padder.update(plaintext.encode('utf-8')) + padder.finalize()

        # Encrypt
        ciphertext = encryptor.update(padded_data) + encryptor.finalize()

        # Create token structure
        token_data = {
            'iv': base64.b64encode(iv).decode('utf-8'),
            'value': base64.b64encode(ciphertext).decode('utf-8')
        }

        # Base64 encode the entire structure
        token_json = json.dumps(token_data)
        token = base64.b64encode(token_json.encode('utf-8')).decode('utf-8')

        return token

    def generate_rdp_token(self, hostname: str, username: str, password: str,
                          width: int = 1920, height: int = 1080,
                          enable_drive: bool = True, enable_recording: bool = True) -> str:
        """Generate token for RDP connection."""
        config = {
            'connection': {
                'type': 'rdp',
                'settings': {
                    'hostname': hostname,
                    'username': username,
                    'password': password,
                    'width': width,
                    'height': height,
                    'dpi': 96,
                    'security': 'any',
                    'ignore-cert': True,
                    'enable-wallpaper': False,
                }
            }
        }

        if enable_drive:
            config['connection']['settings'].update({
                'enable-drive': True,
                'drive-path': '/tmp/guac-drive',
                'create-drive-path': True
            })

        if enable_recording:
            config['connection']['settings']['recording-path'] = '${HISTORY_UUID}'
            config['connection']['settings']['recording-name'] = 'session'

        return self.encrypt_token(config)

    def generate_ssh_token(self, hostname: str, username: str, password: str = None,
                          private_key: str = None, enable_sftp: bool = True,
                          enable_recording: bool = True) -> str:
        """Generate token for SSH connection."""
        config = {
            'connection': {
                'type': 'ssh',
                'settings': {
                    'hostname': hostname,
                    'username': username,
                    'port': 22,
                    'font-size': 12,
                    'color-scheme': 'gray-black',
                    'terminal-type': 'xterm-256color'
                }
            }
        }

        if password:
            config['connection']['settings']['password'] = password
        elif private_key:
            config['connection']['settings']['private-key'] = private_key

        if enable_sftp:
            config['connection']['settings']['enable-sftp'] = True
            config['connection']['settings']['sftp-root-directory'] = '/home/' + username

        if enable_recording:
            config['connection']['settings']['typescript-path'] = '${HISTORY_UUID}'
            config['connection']['settings']['typescript-name'] = 'session'

        return self.encrypt_token(config)

    def generate_vnc_token(self, hostname: str, password: str = None,
                          port: int = 5900, enable_recording: bool = True) -> str:
        """Generate token for VNC connection."""
        config = {
            'connection': {
                'type': 'vnc',
                'settings': {
                    'hostname': hostname,
                    'port': port,
                    'color-depth': 24
                }
            }
        }

        if password:
            config['connection']['settings']['password'] = password

        if enable_recording:
            config['connection']['settings']['recording-path'] = '${HISTORY_UUID}'
            config['connection']['settings']['recording-name'] = 'session'

        return self.encrypt_token(config)

    def generate_join_token(self, connection_id: str, read_only: bool = False) -> str:
        """Generate token to join existing session."""
        config = {
            'connection': {
                'join': connection_id,
                'settings': {
                    'read-only': read_only
                }
            }
        }

        return self.encrypt_token(config)


def main():
    parser = argparse.ArgumentParser(
        description='Generate encrypted tokens for Guacamole connections',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Generate RDP token
  %(prog)s --protocol rdp --host 192.168.1.100 --user Administrator --password pass123

  # Generate SSH token with SFTP
  %(prog)s --protocol ssh --host 192.168.1.101 --user ubuntu --password pass123 --enable-sftp

  # Generate VNC token
  %(prog)s --protocol vnc --host 192.168.1.102 --password vncpass --port 5901

  # Generate full URL
  %(prog)s --protocol rdp --host 192.168.1.100 --user Admin --password pass --output-url

  # Join existing session
  %(prog)s --join CONNECTION_ID --read-only
        """
    )

    parser.add_argument('--key', default='MySuperSecretKeyForParamsToken12',
                       help='32-character secret key (default: MySuperSecretKeyForParamsToken12)')
    parser.add_argument('--protocol', choices=['rdp', 'ssh', 'vnc'],
                       help='Connection protocol')
    parser.add_argument('--host', help='Remote host address')
    parser.add_argument('--port', type=int, help='Remote port (VNC only)')
    parser.add_argument('--user', help='Username')
    parser.add_argument('--password', help='Password')
    parser.add_argument('--private-key', help='SSH private key (SSH only)')
    parser.add_argument('--width', type=int, default=1920, help='Screen width (default: 1920)')
    parser.add_argument('--height', type=int, default=1080, help='Screen height (default: 1080)')
    parser.add_argument('--enable-drive', action='store_true', default=True,
                       help='Enable file transfer drive (RDP, default: enabled)')
    parser.add_argument('--enable-sftp', action='store_true', default=True,
                       help='Enable SFTP (SSH, default: enabled)')
    parser.add_argument('--enable-recording', action='store_true', default=True,
                       help='Enable session recording (default: enabled)')
    parser.add_argument('--join', help='Join existing session by connection ID')
    parser.add_argument('--read-only', action='store_true',
                       help='Join session in read-only mode')
    parser.add_argument('--output-url', action='store_true',
                       help='Output full connection URL instead of just token')
    parser.add_argument('--frontend-url', default='http://localhost:3000',
                       help='Frontend URL (default: http://localhost:3000)')

    args = parser.parse_args()

    # Validate secret key
    if len(args.key) != 32:
        parser.error("Secret key must be exactly 32 characters")

    # Create generator
    generator = TokenGenerator(args.key)

    # Generate token based on mode
    if args.join:
        token = generator.generate_join_token(args.join, args.read_only)
    elif args.protocol == 'rdp':
        if not all([args.host, args.user, args.password]):
            parser.error("RDP requires --host, --user, and --password")
        token = generator.generate_rdp_token(
            args.host, args.user, args.password,
            args.width, args.height,
            args.enable_drive, args.enable_recording
        )
    elif args.protocol == 'ssh':
        if not args.host or not args.user:
            parser.error("SSH requires --host and --user")
        if not args.password and not args.private_key:
            parser.error("SSH requires either --password or --private-key")
        token = generator.generate_ssh_token(
            args.host, args.user, args.password, args.private_key,
            args.enable_sftp, args.enable_recording
        )
    elif args.protocol == 'vnc':
        if not args.host:
            parser.error("VNC requires --host")
        token = generator.generate_vnc_token(
            args.host, args.password,
            args.port or 5900, args.enable_recording
        )
    else:
        parser.error("Must specify either --protocol or --join")

    # Output
    if args.output_url:
        url = f"{args.frontend_url}/?token={quote(token)}"
        print(url)
    else:
        print(token)


if __name__ == '__main__':
    main()
