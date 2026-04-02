import { describe, expect, it, beforeEach } from "vitest";
import {
  CommandLane,
  enqueueCommandInLane,
  getQueueSize,
  setCommandLaneConcurrency,
  clearCommandLane,
  resetCommandQueueStateForTest,
} from "./command-queue.js";

describe("CommandLane.Approval", () => {
  beforeEach(() => {
    resetCommandQueueStateForTest();
  });

  it("should allow concurrent execution in approval lane", async () => {
    // Set approval lane concurrency to 2
    setCommandLaneConcurrency(CommandLane.Approval, 2);

    let concurrent = 0;
    let maxConcurrent = 0;

    const task = async (id: number) => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise((resolve) => setTimeout(resolve, 50));
      concurrent--;
      return id;
    };

    // Run 2 tasks concurrently in approval lane
    const [result1, result2] = await Promise.all([
      enqueueCommandInLane(CommandLane.Approval, () => task(1)),
      enqueueCommandInLane(CommandLane.Approval, () => task(2)),
    ]);

    expect(result1).toBe(1);
    expect(result2).toBe(2);
    // Both tasks should have run concurrently (maxConcurrent === 2)
    expect(maxConcurrent).toBe(2);
  });

  it("should process approval commands in separate lane from main session", async () => {
    setCommandLaneConcurrency(CommandLane.Approval, 2);

    // Main lane should process serially
    const mainTask1 = enqueueCommandInLane(CommandLane.Main, async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return "main1";
    });

    // Approval lane should not be blocked by main lane
    const approvalTask = enqueueCommandInLane(CommandLane.Approval, async () => {
      return "approval";
    });

    // Approval should complete before main (different lanes)
    const approvalResult = await approvalTask;
    expect(approvalResult).toBe("approval");

    // Main should still be running
    const mainResult = await mainTask1;
    expect(mainResult).toBe("main1");
  });

  it("should allow approval commands to bypass blocked session", async () => {
    setCommandLaneConcurrency(CommandLane.Approval, 2);

    // Simulate a blocked session (long-running task in main lane)
    const blockedTask = enqueueCommandInLane(CommandLane.Main, async () => {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Long delay
      return "blocked";
    });

    // Approval command in approval lane should not wait for blocked task
    const approvalResult = await enqueueCommandInLane(CommandLane.Approval, async () => {
      return "approved";
    });

    expect(approvalResult).toBe("approved");
    // The blocked task is still running in background but doesn't block approval

    // Clean up
    clearCommandLane(CommandLane.Main);
  });
});