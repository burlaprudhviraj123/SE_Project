
# ==========================================
# Build Stage (Multi-Arch: AMD64 & ARM64)
# ==========================================
FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /build

COPY pom.xml ./
COPY src ./src

RUN mvn clean package -DskipTests

# ==========================================
# Runtime Stage
# ==========================================
FROM eclipse-temurin:17-jre-jammy

WORKDIR /app

RUN groupadd -r appgroup && useradd -r -g appgroup appuser && \
    mkdir -p /app/uploads && \
    chown -R appuser:appgroup /app

COPY --from=builder --chown=appuser:appgroup /build/target/smart-grievance-system-*.jar /app/app.jar

USER appuser

ENV SERVER_PORT=8081 \
    SPRING_PROFILES_ACTIVE=dev \
    UPLOAD_DIR=/app/uploads/ \
    JAVA_TOOL_OPTIONS="-Xms64m -Xmx256m -XX:+UseSerialGC -XX:MaxMetaspaceSize=160m -Xss512k -XX:ActiveProcessorCount=2"

EXPOSE 8081

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "/app/app.jar"]
