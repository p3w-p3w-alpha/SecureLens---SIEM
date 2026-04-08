package com.securelens.service;

import java.util.List;
import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.securelens.dto.AdminCreateUserRequest;
import com.securelens.dto.UserDTO;
import com.securelens.dto.UserStatsResponse;
import com.securelens.exception.EmailAlreadyExistsException;
import com.securelens.exception.ResourceNotFoundException;
import com.securelens.exception.UsernameAlreadyExistsException;
import com.securelens.model.Role;
import com.securelens.model.User;
import com.securelens.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    public List<UserDTO> getAllUsers() {
        return userRepository.findAll().stream().map(this::toDTO).toList();
    }

    public UserDTO getUserById(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
        return toDTO(user);
    }

    public UserDTO updateUserRole(UUID id, Role newRole) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
        String oldRole = user.getRole().name();
        user.setRole(newRole);
        user = userRepository.save(user);
        try { auditService.log("USER_ROLE_CHANGE", "USER", id.toString(), "admin", user.getUsername() + ": " + oldRole + " → " + newRole.name()); } catch (Exception ignored) {}
        return toDTO(user);
    }

    public void deleteUser(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
        String username = user.getUsername();
        userRepository.deleteById(id);
        try { auditService.log("USER_DELETED", "USER", id.toString(), "admin", "User deleted: " + username); } catch (Exception ignored) {}
    }

    public UserDTO createUser(AdminCreateUserRequest req) {
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new EmailAlreadyExistsException("Email is already registered");
        }
        if (userRepository.existsByUsername(req.getUsername())) {
            throw new UsernameAlreadyExistsException("Username is already taken");
        }

        User user = User.builder()
                .username(req.getUsername())
                .email(req.getEmail())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .role(Role.valueOf(req.getRole()))
                .build();
        user = userRepository.save(user);
        try { auditService.log("USER_CREATED_BY_ADMIN", "USER", user.getId().toString(), "admin", "Admin created user: " + user.getUsername()); } catch (Exception ignored) {}
        return toDTO(user);
    }

    public UserStatsResponse getUserStats() {
        List<User> users = userRepository.findAll();
        return UserStatsResponse.builder()
                .totalUsers(users.size())
                .adminCount(users.stream().filter(u -> u.getRole() == Role.ADMIN).count())
                .analystCount(users.stream().filter(u -> u.getRole() == Role.ANALYST).count())
                .build();
    }

    private UserDTO toDTO(User user) {
        return UserDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole().name())
                .build();
    }
}
