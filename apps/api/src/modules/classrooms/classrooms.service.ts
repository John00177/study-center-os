import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateClassroomDto } from "./dto/create-classroom.dto";

@Injectable()
export class ClassroomsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(organizationId: string) {
    return this.prisma.classroom.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
    });
  }

  create(organizationId: string, dto: CreateClassroomDto) {
    return this.prisma.classroom.create({ data: { ...dto, organizationId } });
  }
}
