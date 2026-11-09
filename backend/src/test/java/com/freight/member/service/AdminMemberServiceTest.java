package com.freight.member.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;

import com.freight.global.exception.BusinessException;
import com.freight.global.exception.ErrorCode;
import com.freight.member.dto.AdminMemberDetailResponse;
import com.freight.member.dto.AdminMemberResponse;
import com.freight.member.dto.MemberCountsResponse;
import com.freight.member.entity.Member;
import com.freight.member.entity.MemberStatus;
import com.freight.member.entity.Role;
import com.freight.member.repository.MemberRepository;
import com.freight.order.service.OrderService;
import com.freight.vehicle.entity.BodyType;
import com.freight.vehicle.entity.Vehicle;
import com.freight.vehicle.entity.VehicleType;
import com.freight.vehicle.service.VehicleService;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

@ExtendWith(MockitoExtension.class)
class AdminMemberServiceTest {

    @Mock
    private MemberRepository memberRepository;

    @Mock
    private VehicleService vehicleService;

    @Mock
    private OrderService orderService;

    @InjectMocks
    private AdminMemberService adminMemberService;

    @Test
    @DisplayName("회원 목록 필터링 페이징 조회 성공")
    void getMembers_success() {
        // given
        Pageable pageable = PageRequest.of(0, 10);
        Member member = Member.builder()
                .id(1L)
                .email("test@x.com")
                .password("encoded")
                .name("차주1")
                .phone("010-1111-2222")
                .role(Role.DRIVER)
                .status(MemberStatus.ACTIVE)
                .build();
        given(memberRepository.findMembersByFilter(eq(Role.DRIVER), eq(MemberStatus.ACTIVE), eq("차주"), any()))
                .willReturn(new PageImpl<>(List.of(member), pageable, 1));

        // when
        Page<AdminMemberResponse> result =
                adminMemberService.getMembers(Role.DRIVER, MemberStatus.ACTIVE, "차주", pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).email()).isEqualTo("test@x.com");
        assertThat(result.getContent().get(0).role()).isEqualTo(Role.DRIVER);
        assertThat(result.getContent().get(0).status()).isEqualTo(MemberStatus.ACTIVE);
    }

    @Test
    @DisplayName("차주 회원 상세 조회 시 차량 정보와 배차 취소 횟수를 함께 반환한다")
    void getMemberDetail_driver_success() {
        // given
        Long driverId = 3L;
        Member driver = Member.builder()
                .id(driverId)
                .email("driver@x.com")
                .password("encoded")
                .name("차주")
                .phone("010-3333-4444")
                .role(Role.DRIVER)
                .status(MemberStatus.ACTIVE)
                .build();

        Vehicle vehicle = Vehicle.builder()
                .id(10L)
                .driver(driver)
                .vehicleType(VehicleType.TON_5)
                .plateNumber("80가1234")
                .bodyType(BodyType.CARGO)
                .build();

        given(memberRepository.findById(driverId)).willReturn(Optional.of(driver));
        given(vehicleService.findByDriverId(driverId)).willReturn(Optional.of(vehicle));
        given(orderService.countDriverCancellations(driverId)).willReturn(2L);

        // when
        AdminMemberDetailResponse detail = adminMemberService.getMemberDetail(driverId);

        // then
        assertThat(detail.id()).isEqualTo(driverId);
        assertThat(detail.vehicle()).isNotNull();
        assertThat(detail.vehicle().plateNumber()).isEqualTo("80가1234");
        assertThat(detail.vehicle().vehicleType()).isEqualTo(VehicleType.TON_5);
        assertThat(detail.cancellationCount()).isEqualTo(2L);
    }

    @Test
    @DisplayName("화주 회원 상세 조회 시 차량 정보는 null이고 배차 취소 횟수는 0을 반환한다")
    void getMemberDetail_shipper_success() {
        // given
        Long shipperId = 2L;
        Member shipper = Member.builder()
                .id(shipperId)
                .email("shipper@x.com")
                .password("encoded")
                .name("화주")
                .phone("010-2222-3333")
                .role(Role.SHIPPER)
                .status(MemberStatus.ACTIVE)
                .build();

        given(memberRepository.findById(shipperId)).willReturn(Optional.of(shipper));

        // when
        AdminMemberDetailResponse detail = adminMemberService.getMemberDetail(shipperId);

        // then
        assertThat(detail.id()).isEqualTo(shipperId);
        assertThat(detail.vehicle()).isNull();
        assertThat(detail.cancellationCount()).isZero();
    }

    @Test
    @DisplayName("존재하지 않는 회원 상세 조회 시 MEMBER_NOT_FOUND 예외가 발생한다")
    void getMemberDetail_notFound_throwsException() {
        // given
        given(memberRepository.findById(999L)).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> adminMemberService.getMemberDetail(999L))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.MEMBER_NOT_FOUND);
    }

    @Test
    @DisplayName("회원 상태 정지 성공")
    void updateMemberStatus_suspend_success() {
        // given
        Long memberId = 2L;
        Long adminId = 1L;
        Member member = Member.builder()
                .id(memberId)
                .email("user@x.com")
                .name("회원")
                .role(Role.SHIPPER)
                .status(MemberStatus.ACTIVE)
                .build();
        given(memberRepository.findById(memberId)).willReturn(Optional.of(member));

        // when
        AdminMemberResponse response = adminMemberService.updateMemberStatus(memberId, MemberStatus.SUSPENDED, adminId);

        // then
        assertThat(response.status()).isEqualTo(MemberStatus.SUSPENDED);
        assertThat(member.getStatus()).isEqualTo(MemberStatus.SUSPENDED);
    }

    @Test
    @DisplayName("관리자 본인의 계정을 정지하려 하면 ADMIN_CANNOT_SUSPEND_SELF 예외가 발생한다")
    void updateMemberStatus_selfSuspend_throwsException() {
        // given
        Long adminId = 1L;
        Member admin = Member.builder()
                .id(adminId)
                .email("admin@x.com")
                .name("관리자")
                .role(Role.ADMIN)
                .status(MemberStatus.ACTIVE)
                .build();
        given(memberRepository.findById(adminId)).willReturn(Optional.of(admin));

        // when & then
        assertThatThrownBy(() -> adminMemberService.updateMemberStatus(adminId, MemberStatus.SUSPENDED, adminId))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.ADMIN_CANNOT_SUSPEND_SELF);
    }

    @Test
    @DisplayName("회원 역할별 카운트 통계 조회 성공")
    void getMemberCounts_success() {
        // given
        given(memberRepository.count()).willReturn(7L);
        given(memberRepository.countByRole(Role.SHIPPER)).willReturn(2L);
        given(memberRepository.countByRole(Role.DRIVER)).willReturn(5L);

        // when
        MemberCountsResponse counts = adminMemberService.getMemberCounts();

        // then
        assertThat(counts.total()).isEqualTo(7L);
        assertThat(counts.shipper()).isEqualTo(2L);
        assertThat(counts.driver()).isEqualTo(5L);
    }
}
