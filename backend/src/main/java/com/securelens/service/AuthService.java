package com.securelens.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.securelens.dto.AuthResponse;
import com.securelens.dto.LoginRequest;
import com.securelens.dto.RegisterRequest;
import com.securelens.dto.UserDTO;
import com.securelens.exception.EmailAlreadyExistsException;
import com.securelens.exception.InvalidCredentialsException;
import com.securelens.exception.UsernameAlreadyExistsException;
import com.securelens.model.Role;
import com.securelens.model.User;
import com.securelens.repository.UserRepository;
import com.securelens.security.JwtUtil;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuditService auditService;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new EmailAlreadyExistsException("Email is already registered");
        }
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new UsernameAlreadyExistsException("Username is already taken");
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(userRepository.count() == 0 ? Role.ADMIN : Role.ANALYST)
                .build();

        user = userRepository.save(user);

        try { auditService.log("USER_REGISTER", "USER", user.getId().toString(), user.getUsername(), "User registered: " + user.getUsername()); } catch (Exception ignored) {}

        String token = jwtUtil.generateToken(user);
        return buildAuthResponse(user, token);
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new InvalidCredentialsException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new InvalidCredentialsException("Invalid email or password");
        }

        try { auditService.log("USER_LOGIN", "USER", user.getId().toString(), user.getUsername(), "User logged in: " + user.getUsername()); } catch (Exception ignored) {}

        String token = jwtUtil.generateToken(user);
        return buildAuthResponse(user, token);
    }

    private AuthResponse buildAuthResponse(User user, String token) {
        UserDTO userDTO = UserDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole().name())
                .build();

        return AuthResponse.builder()
                .token(token)
                .user(userDTO)
                .build();
    }
}
